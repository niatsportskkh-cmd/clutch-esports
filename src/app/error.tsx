'use client'
import { Button } from '@/components/Button'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-start justify-center gap-6">
      <h1 className="display text-5xl sm:text-7xl">That did not load</h1>
      <p className="max-w-[48ch] text-lg text-muted">Something failed on our side. Your registrations are safe. Try again, and if it keeps happening come back in a minute.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
