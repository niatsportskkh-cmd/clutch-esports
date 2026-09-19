'use client'
import { useEffect, useRef } from 'react'
import { setSwarmReady } from './scene-store'

/** Mounted once in the root layout and never remounted: navigation morphs the swarm instead of reloading it. */
export default function SceneCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let dispose = () => {}
    let gone = false
    // three stays off the critical path: it loads after first paint
    import('./swarm').then(m => { if (!gone && ref.current) { dispose = m.createSwarm(ref.current).dispose; setSwarmReady() } })
    return () => { gone = true; dispose() }
  }, [])
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
}
