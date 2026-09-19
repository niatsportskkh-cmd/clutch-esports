'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * A muted publisher loop that loads and plays only while on screen, and never under reduced motion or Data Saver:
 * the key art underneath stays, which is what those settings ask for. It fades in once it is actually playing.
 */
export function LoopVideo({ src, className = '' }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const v = ref.current!
    const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData
    if (saveData || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return v.pause()
      if (!v.getAttribute('src')) v.src = src
      v.play().catch(() => {}) // autoplay refused: the art stays, nothing to report
    }, { threshold: 0.25 })
    io.observe(v)
    return () => io.disconnect()
  }, [src])
  return (
    <video ref={ref} muted loop playsInline preload="none" aria-hidden onPlaying={() => setPlaying(true)}
      className={`transition-opacity duration-1000 ${playing ? 'opacity-100' : 'opacity-0'} ${className}`} />
  )
}
