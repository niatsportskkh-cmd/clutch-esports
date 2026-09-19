'use client'
import { useSyncExternalStore } from 'react'

// One shared 1 s tick. The server snapshot is 0, so server and first client render agree and hydration never mismatches.
const subscribe = (cb: () => void) => { const id = setInterval(cb, 1000); return () => clearInterval(id) }
const seconds = () => Math.floor(Date.now() / 1000)

export function Countdown({ to, className = '' }: { to: string; className?: string }) {
  const now = useSyncExternalStore(subscribe, seconds, () => 0)
  if (!now) return <span className={className}>&nbsp;</span>
  const s = Math.floor(new Date(to).getTime() / 1000) - now
  if (s <= 0) return <span className={className}>Live now</span>
  const d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <time dateTime={to} className={`num ${className}`}>
      {d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m ${pad(s % 60)}s`}
    </time>
  )
}
