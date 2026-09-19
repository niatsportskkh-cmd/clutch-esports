import type { CSSProperties } from 'react'
import { GAME, GAMES } from '@/lib/games'
import { BackLink } from './BackLink'
import { Button } from './Button'
import { GameIcon } from './GameIcon'
import { SceneTarget } from './scene/SceneTarget'

/**
 * What a logged-out visitor sees instead of the Games page, a contest or a register form. It tells them, rather than
 * bouncing them to the login form, and logging in or signing up brings them back to `next`.
 */
export function LoginGate({ next }: { next: string }) {
  const q = `?next=${encodeURIComponent(next)}`
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <SceneTarget shape="trophy" hue={null} />
      <BackLink href="/">Home</BackLink>
      <div className="rise flex flex-col items-start gap-6">
        <h1 style={{ '--i': 0 } as CSSProperties} className="display text-[clamp(2.6rem,8vw,4.5rem)]">Log in to see contests and register</h1>
        <p style={{ '--i': 1 } as CSSProperties} className="max-w-[48ch] text-lg leading-relaxed text-muted">
          Contests are for NIAT students with a Clutch account. Signing up takes a minute: your NIAT ID and your NIAT registered number. Your college comes from the student list, and you see the contests open to it. Entry is free.
        </p>
        <div style={{ '--i': 2 } as CSSProperties} className="flex flex-wrap gap-3">
          <Button href={`/login${q}`}>Log in</Button>
          <Button href={`/signup${q}`} variant="secondary">Sign up</Button>
        </div>
        <ul style={{ '--i': 3 } as CSSProperties} aria-label="Games on Clutch" className="mt-4 flex flex-wrap gap-2">
          {GAMES.map(g => (
            <li key={g} className="flex items-center gap-2 rounded-full bg-white/[0.04] py-1.5 pr-4 pl-1.5 text-sm font-semibold text-muted ring-1 ring-inset ring-white/10">
              <GameIcon game={g} size={24} /> {GAME[g].name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
