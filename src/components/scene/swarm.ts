import * as THREE from 'three'
import { getTarget, setActiveStage, stages, subscribe, type Target } from './scene-store'
import { GAMES } from '@/lib/games'
import { field, loadMasks, shapeFor } from './shapes'

const TAU = Math.PI * 2
const MORPH_S = 1.6
const STAGGER = 0.35 // must match the vertex shader

const VERT = /* glsl */ `
attribute vec3 aFrom; attribute vec3 aTo; attribute float aSeed;
uniform float uProgress, uTime, uSize, uMotion, uRot, uBurst, uScale;
uniform vec2 uPointer, uAnchor;
varying float vAlpha;
void main() {
  float p = clamp((uProgress - aSeed * ${STAGGER}) / ${1 - STAGGER}, 0.0, 1.0);
  p = p * p * (3.0 - 2.0 * p);
  vec3 pos = mix(aFrom, aTo, p);
  float arc = sin(p * 3.14159);
  vec3 n = vec3(sin(aSeed * 91.7 + uTime * 0.7), cos(aSeed * 53.3 + uTime * 0.9), sin(aSeed * 27.1 - uTime * 0.5));
  pos += n * (0.9 * arc + 0.02) * uMotion;                          // flight scatter + idle shimmer
  pos += normalize(pos + n * 0.01) * uBurst * (0.6 + aSeed) * 2.2;  // radial burst
  float c = cos(uRot), s = sin(uRot);
  pos = vec3(c * pos.x + s * pos.z, pos.y, -s * pos.x + c * pos.z);
  pos = pos * uScale + vec3(uAnchor, 0.0);
  vec2 d = pos.xy - uPointer;                                       // pointer push, after rotation so it is screen-true
  pos.xy += normalize(d + 1e-5) * 0.4 * uMotion * smoothstep(0.9, 0.0, length(d));
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float big = step(0.94, fract(aSeed * 7.31));                       // ~6% are large soft glows: cheap depth, no bloom pass
  gl_PointSize = uSize * (0.6 + aSeed * 0.8) * (1.0 + big * 4.0) / -mv.z;
  gl_Position = projectionMatrix * mv;
  vAlpha = (0.5 + 0.5 * aSeed) * (1.0 - big * 0.78);
}`

const FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uOpacity;
varying float vAlpha;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(uColor, a * a * vAlpha * uOpacity); // uColor is already gamma-encoded sRGB: no colorspace chunk
}`

/** OKLCH to gamma-encoded sRGB, clamped, so particles match the CSS accent. */
function oklch(L: number, C: number, hDeg: number, out: number[]) {
  const h = (hDeg * Math.PI) / 180, a = C * Math.cos(h), b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  for (let i = 0; i < 3; i++) {
    const x = Math.min(1, Math.max(0, lin[i]))
    out[i] = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  }
  return out
}

function quality() {
  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 800
  const cores = navigator.hardwareConcurrency ?? 8
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 8
  if (coarse || cores <= 4 || mem <= 4) return { count: 12000, dpr: 1.5, coarse }
  return cores <= 8 ? { count: 24000, dpr: 2, coarse } : { count: 40000, dpr: 2, coarse }
}

export function createSwarm(canvas: HTMLCanvasElement): { dispose(): void } {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'high-performance' })
  } catch {
    canvas.style.display = 'none' // the CSS background underneath is the fallback
    return { dispose() {} }
  }

  const q = quality()
  const COUNT = q.count
  const ink = oklch(0.115, 0, 0, [0, 0, 0]) // Clutch Black
  renderer.setClearColor(new THREE.Color().setRGB(ink[0], ink[1], ink[2], THREE.SRGBColorSpace), 1) // values are sRGB; three re-encodes on clear
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.dpr))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 20)
  camera.position.z = 6
  const HALF_H = Math.tan((25 * Math.PI) / 180) * 6 // half the visible world height at z = 0

  const geo = new THREE.BufferGeometry()
  const aFrom = new THREE.BufferAttribute(field(COUNT), 3)
  const aTo = new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3)
  const seeds = new Float32Array(COUNT)
  for (let i = 0; i < COUNT; i++) seeds[i] = Math.random()
  aTo.array.set(aFrom.array)
  aFrom.setUsage(THREE.DynamicDrawUsage); aTo.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('position', aTo) // three wants a position attribute; the shader ignores it
  geo.setAttribute('aFrom', aFrom)
  geo.setAttribute('aTo', aTo)
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

  const u = {
    uProgress: { value: 1 }, uTime: { value: 0 }, uSize: { value: 10 }, uMotion: { value: 1 }, uRot: { value: 0 },
    uBurst: { value: 0 }, uScale: { value: 1 }, uOpacity: { value: 0 },
    uPointer: { value: new THREE.Vector2(99, 99) }, uAnchor: { value: new THREE.Vector2() },
    uColor: { value: new THREE.Vector3(1, 1, 1) },
  }
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, uniforms: u,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  scene.add(points)

  // ---- state (all scratch is hoisted: nothing is allocated per frame)
  let target: Target = getTarget()
  let shapeKey = ''
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let raf = 0, last = 0, time = 0, rot = 0, burstT = -1, frames = 0, frameSum = 0, halved = false
  let needsResize = true, ptrX = 99, ptrY = 99, disposed = false
  let activeEl: HTMLElement | null = null, activeT: Target | null | undefined
  const goalColor = [1, 1, 1], color = [1, 1, 1]
  let goalOpacity = 0, anchorX = 0, anchorY = 0, scale = 1
  const stats = new URLSearchParams(location.search).has('glstats')

  function retarget(t: Target) {
    target = t
    // every shape is Clutch Red; t.hue is ignored for the brand's one-accent rule
    oklch(0.635, 0.251, 28.4, goalColor)
    goalOpacity = t.shape === 'field' ? 0.22 : 0.85

    const key = `${t.shape}:${t.teams}`
    if (key === shapeKey && !t.burst) return // same shape: only the colour moves
    shapeKey = key
    // bake where every particle is right now into aFrom, so interrupting a morph never pops
    const from = aFrom.array as Float32Array, to = aTo.array as Float32Array, prog = u.uProgress.value
    for (let i = 0; i < COUNT; i++) {
      let p = Math.min(1, Math.max(0, (prog - seeds[i] * STAGGER) / (1 - STAGGER)))
      p = p * p * (3 - 2 * p)
      const j = i * 3
      from[j] += (to[j] - from[j]) * p; from[j + 1] += (to[j + 1] - from[j + 1]) * p; from[j + 2] += (to[j + 2] - from[j + 2]) * p
    }
    to.set(shapeFor(t, COUNT))
    aFrom.needsUpdate = true; aTo.needsUpdate = true
    u.uProgress.value = reduced ? 1 : 0
    burstT = t.burst && !reduced ? 0 : -1
  }

  function resize() {
    needsResize = false
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    u.uSize.value = renderer.domElement.height * 0.016
  }

  /** Find the most visible stage and aim the swarm at its box. CSS owns the layout; this only follows it. */
  function followStage() {
    let best: HTMLElement | null = null, bestArea = 0, bx = 0, by = 0, bw = 0, bh = 0
    for (const el of stages.keys()) {
      const r = el.getBoundingClientRect()
      const area = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0))
      if (area > bestArea) { best = el; bestArea = area; bx = r.left + r.width / 2; by = r.top + r.height / 2; bw = r.width; bh = r.height }
    }
    const t = best ? stages.get(best) ?? null : undefined
    if (best !== activeEl || t !== activeT) { activeEl = best; activeT = t; setActiveStage(t) }
    const px = (2 * HALF_H) / innerHeight // world units per CSS pixel at z = 0
    if (best) {
      anchorX = (bx - innerWidth / 2) * px
      anchorY = -(by - innerHeight / 2) * px
      scale = Math.min(1.15, (Math.min(bw, bh) * px) / 3.4)
    } else { anchorX = 0; anchorY = 0; scale = 1.2 }
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016)
    last = now
    time += dt
    if (needsResize) resize()
    followStage()

    // budget: if the first stretch of frames is slow, draw half the points at DPR 1
    if (!halved && ++frames > 30 && frames <= 120) {
      frameSum += dt
      if (frames === 120 && frameSum / 90 > 0.024) {
        halved = true
        geo.setDrawRange(0, COUNT >> 1)
        renderer.setPixelRatio(1)
        needsResize = true
      }
    }

    if (burstT >= 0) {
      burstT += dt
      u.uBurst.value = burstT < 0.45 ? 1 - (1 - burstT / 0.45) ** 3 : Math.max(0, 1 - (burstT - 0.45) / 0.7)
      if (burstT > 1.15) burstT = -1
    }
    if (burstT < 0 || burstT > 0.35) u.uProgress.value = Math.min(1, u.uProgress.value + dt / MORPH_S)

    if (reduced) rot = 0
    else if (target.shape === 'trophy') rot += dt * 0.35
    else rot += (Math.round(rot / TAU) * TAU + Math.sin(time * 0.5) * 0.3 - rot) * Math.min(1, dt * 3)

    // reduced motion: values snap (k = 1) and nothing drifts; the loop only keeps the swarm glued to its stage while scrolling
    const k = reduced ? 1 : Math.min(1, dt * 4)
    for (let i = 0; i < 3; i++) color[i] += (goalColor[i] - color[i]) * k
    u.uColor.value.set(color[0], color[1], color[2])
    u.uOpacity.value += (goalOpacity - u.uOpacity.value) * k
    const follow = reduced ? 1 : Math.min(1, dt * 9) // tighter than colour so scrolling does not leave the swarm behind
    u.uAnchor.value.x += (anchorX - u.uAnchor.value.x) * follow
    u.uAnchor.value.y += (anchorY - u.uAnchor.value.y) * follow
    u.uScale.value += (scale - u.uScale.value) * k
    u.uPointer.value.x += (ptrX - u.uPointer.value.x) * Math.min(1, dt * 10)
    u.uPointer.value.y += (ptrY - u.uPointer.value.y) * Math.min(1, dt * 10)
    u.uTime.value = time
    u.uRot.value = rot
    u.uMotion.value = reduced ? 0 : 1
    if (reduced) { u.uProgress.value = 1; u.uBurst.value = 0 }

    renderer.render(scene, camera)
    if (stats) (window as unknown as { __gl: unknown }).__gl = { calls: renderer.info.render.calls, ms: dt * 1000, count: halved ? COUNT >> 1 : COUNT }
  }

  const start = () => { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame) } }
  const stop = () => { cancelAnimationFrame(raf); raf = 0 }

  // ---- listeners (no scroll listener: the frame loop reads the stage's box directly)
  const onPointer = (e: PointerEvent) => {
    ptrX = (e.clientX / innerWidth * 2 - 1) * HALF_H * camera.aspect
    ptrY = -(e.clientY / innerHeight * 2 - 1) * HALF_H
  }
  const onPointerGone = (e: PointerEvent) => { if (e.type === 'pointerleave' || e.pointerType !== 'mouse') { ptrX = 99; ptrY = 99 } }
  const onResize = () => { needsResize = true }
  const onVisibility = () => (document.hidden ? stop() : start())
  const mq = matchMedia('(prefers-reduced-motion: reduce)')
  const onMotion = () => { reduced = mq.matches }

  window.addEventListener('pointermove', onPointer, { passive: true })
  window.addEventListener('pointerup', onPointerGone, { passive: true })
  document.documentElement.addEventListener('pointerleave', onPointerGone)
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)
  mq.addEventListener('change', onMotion)
  const unsubscribe = subscribe(retarget)

  retarget(target) // first morph: from the loose field into whatever the page asked for
  start()
  // masks land after the first frame: re-aim once they have, so a game page opened directly still gets its logo
  loadMasks().then(() => { if (!disposed && (GAMES as readonly string[]).includes(target.shape)) { shapeKey = ''; retarget(target) } })

  return {
    dispose() {
      disposed = true
      stop()
      unsubscribe()
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerup', onPointerGone)
      document.documentElement.removeEventListener('pointerleave', onPointerGone)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      mq.removeEventListener('change', onMotion)
      geo.dispose(); mat.dispose(); renderer.dispose()
    },
  }
}
