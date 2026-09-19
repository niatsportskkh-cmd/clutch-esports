'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Keeps slot counts moving without a reload. ponytail: polling; switch to SSE or change streams if load ever matters. */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') router.refresh() }, seconds * 1000)
    return () => clearInterval(id)
  }, [router, seconds])
  return null
}
