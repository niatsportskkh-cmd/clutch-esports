'use client'
import { useState } from 'react'

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      className="min-h-11 rounded-full bg-white/[0.07] px-4 text-sm font-semibold text-text ring-1 ring-inset ring-white/15 transition-[transform,background-color] duration-500 ease-spring hover:bg-white/[0.13] active:scale-[0.96]"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
    >
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
