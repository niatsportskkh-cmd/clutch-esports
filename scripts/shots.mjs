// Headless Chrome screenshots over the DevTools Protocol, using Node's built-in WebSocket. No puppeteer.
//   node scripts/shots.mjs /@home /games/x@game
//   options: --base http://localhost:3100  --only desktop|phone  --wait 2500  --eval "js run after load"
//            --cookie "name=value"  --scroll 800  --hover "css selector" (real mouse move)  --gpu  --reduced  --intro (show the first-visit loader)  --out shots
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args.splice(i, 2)[1] }
const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 && !!args.splice(i, 1) }
const base = opt('base', 'http://localhost:3100'), only = opt('only'), wait = +opt('wait', 2500), js = opt('eval')
const cookie = opt('cookie'), hover = opt('hover'), scroll = +opt('scroll', 0), out = opt('out', 'shots'), gpu = flag('gpu'), reduced = flag('reduced'), intro = flag('intro')
const pages = args.map(a => { const i = a.lastIndexOf('@'), path = i < 0 ? a : a.slice(0, i); return { path, name: i < 0 ? path.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home' : a.slice(i + 1) } })
const VIEWS = [
  { id: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
  { id: 'phone', width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
].filter(v => !only || v.id === only)

const profile = mkdtempSync(join(tmpdir(), 'clutch-shots-'))
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars',
  ...(gpu ? ['--enable-gpu', '--use-angle=gl-egl', '--ozone-platform=headless'] : ['--enable-unsafe-swiftshader']),
], { stdio: ['ignore', 'ignore', 'pipe'] })
const wsUrl = await new Promise((resolve, reject) => {
  let buf = ''
  chrome.stderr.on('data', d => { buf += d; const m = buf.match(/ws:\/\/\S+/); if (m) resolve(m[0]) })
  chrome.on('exit', c => reject(new Error(`chrome exited ${c}\n${buf}`)))
})

const ws = new WebSocket(wsUrl)
await new Promise(r => (ws.onopen = r))
let nextId = 0
const pending = new Map(), waiters = []
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data)
  if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); if (m.error) reject(new Error(m.error.message)); else resolve(m.result) }
  else if (m.method) for (const w of [...waiters]) if (w.method === m.method && w.sessionId === m.sessionId) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m.params) }
}
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++nextId
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params, sessionId }))
})
const event = (method, sessionId) => new Promise(resolve => waiters.push({ method, sessionId, resolve }))
const sleep = ms => new Promise(r => setTimeout(r, ms))

mkdirSync(out, { recursive: true })
try {
  for (const view of VIEWS) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId: s } = await send('Target.attachToTarget', { targetId, flatten: true })
    await send('Page.enable', {}, s)
    await send('Runtime.enable', {}, s)
    await send('Emulation.setDeviceMetricsOverride', { width: view.width, height: view.height, deviceScaleFactor: view.deviceScaleFactor, mobile: view.mobile }, s)
    if (view.mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true }, s)
    // headless Chrome on Linux reports reduced motion by default, which would hide every animation
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] }, s)
    // a fresh profile is a first visit, so every page would open behind the loader: mark it seen unless asked
    if (!intro) await send('Page.addScriptToEvaluateOnNewDocument', { source: "try{sessionStorage.setItem('clutch-intro','1')}catch(e){}" }, s)
    if (cookie) {
      const eq = cookie.indexOf('=')
      await send('Network.setCookie', { name: cookie.slice(0, eq), value: cookie.slice(eq + 1), url: base }, s)
    }
    for (const page of pages) {
      const loaded = event('Page.loadEventFired', s)
      await send('Page.navigate', { url: base + page.path }, s)
      await loaded
      await sleep(wait)
      const run = expression => send('Runtime.evaluate', { expression, awaitPromise: true, userGesture: true }, s)
      if (scroll) { await run(`document.documentElement.style.scrollBehavior='auto'; scrollTo(0, ${scroll})`); await sleep(900) }
      if (hover) {
        const r = await run(`(() => { const el = document.querySelector(${JSON.stringify(hover)}); if (!el) return null; el.scrollIntoView({ block: 'center', behavior: 'instant' }); const b = el.getBoundingClientRect(); return JSON.stringify([b.x + b.width / 2, b.y + b.height / 2]) })()`)
        if (!r.result?.value) console.error('hover target not found:', hover)
        else {
          const [x, y] = JSON.parse(r.result.value)
          await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 40, y }, s)
          await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, s)
          await sleep(wait)
        }
      }
      if (js) {
        const r = await run(js)
        if (r.exceptionDetails) console.error('eval failed:', r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
        else if (r.result?.value !== undefined) console.log('eval ->', JSON.stringify(r.result.value))
        await sleep(wait)
      }
      const { data } = await send('Page.captureScreenshot', { format: 'png' }, s)
      const file = join(out, `${page.name}-${view.id}.png`)
      writeFileSync(file, Buffer.from(data, 'base64'))
      console.log(file)
    }
    await send('Target.closeTarget', { targetId })
  }
} finally {
  ws.close()
  chrome.kill()
  await sleep(300)
  rmSync(profile, { recursive: true, force: true })
}
