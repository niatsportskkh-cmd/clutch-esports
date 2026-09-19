import { GAMES, type Game } from '@/lib/games'
import type { Target } from './scene-store'

// Every generator returns count*3 floats in roughly a [-1.6, 1.6] box, with points in RANDOM order:
// the swarm halves its draw range on slow devices, and a prefix must stay a uniform subsample.

const TAU = Math.PI * 2
const rand = Math.random
const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(TAU * rand())

export function field(count: number) {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const x = gauss(), y = gauss(), z = gauss()
    const k = Math.cbrt(rand()) / (Math.hypot(x, y, z) || 1)
    out[i * 3] = x * k * 3.2; out[i * 3 + 1] = y * k * 1.9; out[i * 3 + 2] = z * k * 1.2
  }
  return out
}

// lathe profile [y, radius]: base, stem, knot, bowl, rim
const PROFILE = [[-1.5, 0.75], [-1.35, 0.75], [-1.3, 0.3], [-0.6, 0.14], [-0.45, 0.3], [-0.3, 0.14], [-0.1, 0.35], [0.4, 0.95], [1.3, 1.15], [1.38, 1.05]]

function trophy(count: number) {
  const out = new Float32Array(count * 3)
  const cum: number[] = []
  let total = 0
  for (let s = 0; s < PROFILE.length - 1; s++) {
    const [y0, r0] = PROFILE[s], [y1, r1] = PROFILE[s + 1]
    total += Math.hypot(y1 - y0, r1 - r0) * (r0 + r1) // area of a cone frustum is proportional to this
    cum.push(total)
  }
  for (let i = 0; i < count; i++) {
    const pick = rand()
    let x: number, y: number, z: number
    if (pick < 0.14) { // two handles: tilted half-ellipses meeting the bowl
      const side = rand() < 0.5 ? -1 : 1, a = -1.97 + rand() * 3.54
      x = side * (0.95 + Math.cos(a) * 0.55) + gauss() * 0.035
      y = 0.72 + Math.sin(a) * 0.5 + gauss() * 0.035
      z = gauss() * 0.04
    } else if (pick < 0.2) { // sparse surface inside the rim
      const r = Math.sqrt(rand()) * 1.12, a = rand() * TAU
      x = Math.cos(a) * r; y = 1.3; z = Math.sin(a) * r
    } else {
      const w = rand() * total
      let s = 0
      while (cum[s] < w) s++
      const t = rand(), a = rand() * TAU
      const r = PROFILE[s][1] + (PROFILE[s + 1][1] - PROFILE[s][1]) * t
      x = Math.cos(a) * r; y = PROFILE[s][0] + (PROFILE[s + 1][0] - PROFILE[s][0]) * t; z = Math.sin(a) * r
    }
    out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z
  }
  return out
}

const CHECK = 'M20 54l20 20 42-46' // the "you're in" burst: a stroke 12 wide in a 100x100 box

function canvas(N: number) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = N
  return cv.getContext('2d', { willReadFrequently: true })
}

/** Scatter points over a canvas's opaque pixels, fitted to a 3-unit box so every shape has the same visual weight. */
function fromAlpha(ctx: CanvasRenderingContext2D, N: number, count: number, depth = 0.22) {
  const alpha = ctx.getImageData(0, 0, N, N).data
  const filled: number[] = []
  let x0 = N, x1 = 0, y0 = N, y1 = 0
  for (let p = 0; p < N * N; p++) {
    if (alpha[p * 4 + 3] <= 128) continue
    filled.push(p)
    const x = p % N, y = (p / N) | 0
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
  }
  if (!filled.length) return field(count)

  const k = 3 / Math.max(x1 - x0 + 1, y1 - y0 + 1), cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const p = filled[(rand() * filled.length) | 0]
    out[i * 3] = ((p % N) + rand() - cx) * k
    out[i * 3 + 1] = -(((p / N) | 0) + rand() - cy) * k
    out[i * 3 + 2] = (rand() - 0.5) * depth
  }
  return out
}

function check(count: number) {
  const N = 256, ctx = canvas(N)
  if (!ctx) return field(count)
  ctx.scale(N / 100, N / 100)
  ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'
  ctx.stroke(new Path2D(CHECK))
  return fromAlpha(ctx, N, count)
}

// Game logos are public/games/<key>/mask.png: white on transparent, loaded once by loadMasks().
const masks = new Map<Game, ImageBitmap>()
export const loadMasks = () => Promise.all(GAMES.map(async g => {
  try { masks.set(g, await createImageBitmap(await (await fetch(`/games/${g}/mask.png`)).blob())) }
  catch { /* a missing mask leaves that game on the loose field; nothing else depends on it */ }
}))

function fromMask(img: ImageBitmap, count: number) {
  const N = 384, ctx = canvas(N)
  if (!ctx) return field(count)
  const k = N / Math.max(img.width, img.height)
  ctx.drawImage(img, (N - img.width * k) / 2, (N - img.height * k) / 2, img.width * k, img.height * k)
  return fromAlpha(ctx, N, count)
}

/**
 * One blob per team on a sunflower spiral. With no cap on teams the old slot ring had nothing to
 * divide by, and a spiral reads as a count at three teams and still at three hundred.
 */
function teamCloud(n: number, count: number) {
  const out = new Float32Array(count * 3)
  const R = 1.45
  if (n === 0) { // nothing registered yet: a thin empty ring rather than a misleading blob
    for (let i = 0; i < count; i++) {
      const a = rand() * TAU, r = R + gauss() * 0.012
      out[i * 3] = Math.cos(a) * r; out[i * 3 + 1] = Math.sin(a) * r; out[i * 3 + 2] = gauss() * 0.01
    }
    return out
  }
  const GOLDEN = Math.PI * (3 - Math.sqrt(5))
  const s = Math.min(0.1, 0.42 / Math.sqrt(n))
  for (let i = 0; i < count; i++) {
    const k = (rand() * n) | 0 // particles spread evenly over the teams, so every blob keeps its weight
    const r = R * Math.sqrt((k + 0.5) / n), a = k * GOLDEN
    out[i * 3] = Math.cos(a) * r + gauss() * s
    out[i * 3 + 1] = Math.sin(a) * r + gauss() * s
    out[i * 3 + 2] = gauss() * s
  }
  return out
}

const cache = new Map<string, Float32Array>()

export function shapeFor(t: Target, count: number) {
  const key = `${count}:${t.shape}:${t.shape === 'teams' ? t.teams : ''}`
  let pts = cache.get(key)
  if (!pts) {
    if (t.shape === 'trophy') pts = trophy(count)
    else if (t.shape === 'field') pts = field(count)
    else if (t.shape === 'teams') pts = teamCloud(Math.max(0, t.teams ?? 0), count)
    else if (t.shape === 'check') pts = check(count)
    else {
      const m = masks.get(t.shape)
      if (!m) return field(count) // not loaded yet, and not cached, so the logo still arrives
      pts = fromMask(m, count)
    }
    if (cache.size > 40) cache.clear() // team counts change over a long session; never grow without bound
    cache.set(key, pts)
  }
  return pts
}
