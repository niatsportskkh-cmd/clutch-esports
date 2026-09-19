'use client'
import type { ComponentProps, PointerEvent } from 'react'

// Writes the pointer position straight onto the element as CSS variables: no React state, no re-render.
const track = (e: PointerEvent<HTMLDivElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

/**
 * The site's one container: an outer tray with a hairline, and an inner core with its own highlight,
 * so panels read as a plate set into a frame. The accent spotlight follows the pointer around the tray.
 */
export function Panel({ className = '', inner = '', children, ...rest }: ComponentProps<'div'> & { inner?: string }) {
  return (
    <div onPointerMove={track} className={`spot rounded-[1.75rem] bg-white/[0.045] p-1.5 ring-1 ring-white/10 ${className}`} {...rest}>
      <div className={`h-full rounded-[1.375rem] bg-surface shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] ${inner}`}>{children}</div>
    </div>
  )
}
