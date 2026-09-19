import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * The way back, top-left on every page. A real href, not history.back(): someone who opened a shared link
 * has no history to go back to, and the label should say where they will land.
 */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group -ml-1 inline-flex min-h-11 items-center gap-1.5 self-start pr-2 text-sm font-semibold text-muted transition-colors duration-300 hover:text-text">
      <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden className="transition-transform duration-300 ease-spring group-hover:-translate-x-0.5">
        <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </Link>
  )
}
