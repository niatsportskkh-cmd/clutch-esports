'use client'
import { useEffect, useRef, type CSSProperties } from 'react'
import { GAMES } from '@/lib/games'
import { swarmReady } from './scene/scene-store'

const MIN = 1200, MAX = 4000 // ms: long enough to read as intentional, never long enough to be in the way
const OUT = 1150 // ms: the slash, then the two halves parting (see .intro in globals.css)

/**
 * Before first paint this runs from <head>: `playing` only on the first page load of a visit, so the loader is in the
 * very first frame and never flashes on later loads. Without JavaScript nothing sets it and the loader never shows;
 * the timeout lifts it even if React never arrives.
 */
export const INTRO_SCRIPT = `(function(){var d=document.documentElement;try{if(sessionStorage.getItem('clutch-intro')){d.dataset.intro='done';return}}catch(e){d.dataset.intro='done';return}d.dataset.intro='playing';setTimeout(function(){d.dataset.intro='done'},${MAX + OUT + 1500})})()`

/** One copy of the loading scene. It is drawn twice, once per half, so the slash cuts the logo itself in two. */
function Scene() {
  return (
    <>
      <div className="intro-glow" />
      <div className="intro-stage">
        {/* plain img: the raw file is also the glint's mask, so it downloads once */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="intro-logo"><img src="/logo.png" alt="" width={480} height={177} /><span className="intro-scan" /></div>
        <div className="intro-bar"><span data-bar /></div>
      </div>
      <div className="intro-foot">
        <p className="intro-count display num"><span data-count>000</span><small>%</small></p>
        <ul className="intro-games">
          {GAMES.map(g => <li key={g} data-mark style={{ '--mask': `url(/games/${g}/mask.png)` } as CSSProperties} />)}
        </ul>
      </div>
    </>
  )
}

/**
 * The first-visit loading screen. Progress is real: web fonts, every image already on screen, and the particle swarm.
 * It holds at least MIN and at most MAX, then a red slash cuts the screen and the halves part to reveal the page,
 * whose own entrance animations were held paused until now.
 */
export function IntroLoader() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const html = document.documentElement
    if (html.dataset.intro !== 'playing' || !ref.current) return
    const root = ref.current
    const counts = root.querySelectorAll<HTMLElement>('[data-count]'), bars = root.querySelectorAll<HTMLElement>('[data-bar]')
    const marks = root.querySelectorAll<HTMLElement>('[data-mark]')

    const onScreen = [...document.images].filter(i => {
      if (i.complete || root.contains(i)) return false
      const r = i.getBoundingClientRect()
      return r.width > 0 && r.bottom > 0 && r.top < innerHeight
    })
    const tasks = [document.fonts.ready, swarmReady, ...onScreen.map(i => new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }) }))]
    let settled = 0
    for (const t of tasks) t.then(() => settled++, () => settled++)

    let raf = 0, timer = 0, shown = 0
    const start = performance.now()
    let last = start
    const draw = (p: number) => {
      const n = String(Math.round(p * 100)).padStart(3, '0')
      counts.forEach(c => { c.textContent = n })
      bars.forEach(b => { b.style.transform = `scaleX(${p})` })
      marks.forEach((m, i) => m.classList.toggle('on', p >= ((i % GAMES.length) + 1) / GAMES.length - 0.001))
    }
    const tick = (now: number) => {
      const t = now - start
      // real progress, plus a creep that keeps it moving while one slow file holds out; only real progress reaches 100
      const real = t > MAX ? 1 : settled / tasks.length
      const goal = Math.max(real, 0.86 * (1 - Math.exp(-t / 1400)))
      shown += (goal - shown) * (1 - Math.exp(-(now - last) / 150))
      last = now
      const p = Math.min(shown, t / MIN)
      draw(p)
      if (real === 1 && p > 0.995) {
        draw(1)
        html.dataset.intro = 'out'
        try { sessionStorage.setItem('clutch-intro', '1') } catch {}
        timer = window.setTimeout(() => { html.dataset.intro = 'done' }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 350 : OUT)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [])

  return (
    <div ref={ref} className="intro" role="status" aria-label="Loading Clutch">
      <div aria-hidden className="intro-half intro-top"><Scene /></div>
      <div aria-hidden className="intro-half intro-bottom"><Scene /></div>
      <div aria-hidden className="intro-cut" />
    </div>
  )
}
