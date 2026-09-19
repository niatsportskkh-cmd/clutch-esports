import type { Game } from '@/lib/games'

export type Shape = 'trophy' | 'field' | 'teams' | 'check' | Game // a game's shape is its logo, from public/games/<key>/mask.png
export type Target = { shape: Shape; hue: number | null; teams?: number; burst?: boolean }

// Module-level store: the swarm is imperative and lives outside React, so React state would only get in the way.
// Precedence: hover/in-view override > the active stage's own target > the page's base target.
// When no stage is on screen the swarm goes ambient: a faint drifting field in the page's hue.
let base: Target = { shape: 'field', hue: null }
let override: { t: Target; owner: object } | null = null
let stageTarget: Target | null = null
let ambient = true
const subs = new Set<(t: Target) => void>()
const emit = () => subs.forEach(f => f(getTarget()))

export function getTarget(): Target {
  const t = override?.t ?? stageTarget ?? base
  return ambient ? { shape: 'field', hue: t.hue } : t
}

/** The page's resting target. Clears any override left by the previous page. */
export const setBase = (t: Target) => { base = t; override = null; emit() }

/** Temporary target (hover, focused card). Only the owner that set it can clear it. */
export const setOverride = (t: Target | null, owner: object) => {
  if (t) override = { t, owner }
  else if (override?.owner === owner) override = null
  else return
  emit()
}

// Stages are DOM elements the swarm sits inside, so CSS decides where the 3D lives at every breakpoint.
export const stages = new Map<HTMLElement, Target | null>()
export const addStage = (el: HTMLElement, t: Target | null) => { stages.set(el, t); return () => { stages.delete(el) } }

/** Called by the swarm when the most visible stage changes. `undefined` means no stage is on screen. */
export const setActiveStage = (t: Target | null | undefined) => {
  ambient = t === undefined
  stageTarget = t ?? null
  emit()
}

export const subscribe = (f: (t: Target) => void) => { subs.add(f); return () => { subs.delete(f) } }

/** Settles once the swarm has started drawing. The first-visit loading screen waits on it (and gives up after a cap). */
let markReady = () => {}
export const swarmReady = new Promise<void>(r => { markReady = r })
export const setSwarmReady = () => markReady()
