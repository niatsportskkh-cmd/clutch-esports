import Image from 'next/image'
import type { GameView } from '@/lib/tournaments'
import { ART } from '@/lib/game-art'
import { EXTERNAL_REGISTER, teamLabel } from '@/lib/games'
import { Button } from './Button'
import { TeamCount } from './TeamCount'

/**
 * A contest dressed in its game: the publisher's key art behind, the character at the edge, the logo on top.
 * Hover (mouse) or keyboard focus pushes the art in and lifts the character. CSS only; nothing touches the swarm.
 */
export function GameCard({ game }: { game: GameView }) {
  const a = ART[game.game], external = EXTERNAL_REGISTER[game.game]
  return (
    <article className="game-card relative isolate flex min-h-[27rem] overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-white/10 has-focus-visible:ring-2 has-focus-visible:ring-accent sm:min-h-72">
      <Image src={a.art} alt="" fill sizes="(min-width: 896px) 896px, 100vw" className="card-art -z-20 object-cover opacity-60" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#050505_42%,rgb(5_5_5/0.2)_100%)] sm:bg-[linear-gradient(90deg,#050505_30%,rgb(5_5_5/0.75)_58%,rgb(5_5_5/0.1))]" />
      {/* a character stands at the edge; a game with no character (Matiks) shows its phone, tilted */}
      <div aria-hidden className={`card-hero pointer-events-none absolute -z-10 ${a.cutout
        ? 'top-2 right-0 h-[52%] w-[62%] sm:top-6 sm:bottom-0 sm:h-auto sm:w-[40%]'
        : 'top-5 right-[10%] h-[38%] w-[36%] rotate-[7deg] sm:top-[12%] sm:right-[10%] sm:h-[80%] sm:w-[24%]'}`}>
        <Image src={a.hero} alt="" fill sizes="(min-width: 640px) 360px, 62vw" className="object-contain object-bottom" />
      </div>
      <div className="flex flex-1 flex-col justify-end gap-3 p-5 sm:max-w-[62%] sm:justify-center sm:p-7">
        <div className="flex items-center gap-3">
          <Image src={a.logo} alt={game.gameName} sizes="200px" className="h-auto max-h-8 w-auto max-w-44" />
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-text">Free</span>
        </div>
        <h3 className="display text-[1.8rem] text-text sm:text-[2.1rem]">{game.title}</h3>
        <div>
          <p className="font-medium text-text">{game.startsLabel}</p>
          <p className="text-sm text-muted">{teamLabel(game.teamSize)}{game.mode && `, ${game.mode}`}</p>
          {game.locations.length > 0 && <p className="text-sm text-muted">{game.locations.join(', ')}</p>}
        </div>
        <TeamCount teams={game.teams} open={game.open} solo={game.teamSize === 1} className="max-w-72" />
        <div className="flex gap-2">
          {external
            ? <Button href={external} className="px-7">Register</Button>
            : <Button href={`/games/${game.slug}/register`} disabled={!game.open} className="px-7">{game.open ? 'Register' : 'Closed'}</Button>}
          <Button href={`/games/${game.slug}`} variant="secondary" className="px-5">Details</Button>
        </div>
      </div>
    </article>
  )
}
