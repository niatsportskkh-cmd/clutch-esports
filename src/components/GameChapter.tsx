import { GAME, teamLabel, type Game } from '@/lib/games'
import { Button } from './Button'
import { GameBanner } from './GameBanner'
import { SceneStage } from './scene/SceneTarget'

// Five chapters would be one monotonous zigzag, so the compositions vary: art right, art left, a full-width band.
// Never three side-by-side splits in a row.
const LAYOUT = {
  right: { section: 'lg:grid-cols-[5fr_7fr]', art: 'lg:order-2' },
  left: { section: 'lg:grid-cols-[7fr_5fr]', art: '' },
  band: { section: '', art: '' },
}

/** One game, one screen: its art and character, what it is, and where its contests are. The swarm draws its logo. */
export function GameChapter({ game, layout }: { game: Game; layout: keyof typeof LAYOUT }) {
  const g = GAME[game], l = LAYOUT[layout]
  return (
    <section id={game} aria-labelledby={`${game}-name`} className={`grid scroll-mt-24 items-center gap-x-14 gap-y-8 py-12 lg:min-h-[100dvh] lg:content-center lg:py-20 ${l.section}`}>
      <GameBanner game={game} scroll sizes={layout === 'band' ? '(min-width: 1320px) 1256px, 100vw' : '(min-width: 1024px) 58vw, 100vw'}
        className={`h-[46dvh] min-h-72 ${layout === 'band' ? 'lg:h-[58dvh]' : 'lg:h-[70dvh]'} ${l.art}`} />
      <div className={`flex flex-col items-start gap-5 ${layout === 'band' ? 'lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-end lg:gap-x-10' : ''}`}>
        <SceneStage shape={game} hue={null} className={`h-32 w-full max-w-sm sm:h-40 ${layout === 'band' ? 'lg:h-44 lg:w-72' : ''}`} />
        <h2 id={`${game}-name`} className="display text-[clamp(2.8rem,9vw,5.2rem)]">{g.name}</h2>
        <div className="flex flex-col items-start gap-5 lg:max-w-md">
          <p className="text-sm font-semibold text-text">{teamLabel(g.teamSize)} on {g.platform === 'PC' ? 'PC' : 'mobile'}</p>
          <p className="max-w-[40ch] text-lg leading-relaxed text-muted">{g.blurb}</p>
          <p className="max-w-[44ch] leading-relaxed text-muted">{g.about}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted">Made by</dt><dd className="font-semibold text-text">{g.publisher}</dd></div>
            <div><dt className="text-muted">In-game ID</dt><dd className="font-semibold text-text">{g.idHint}</dd></div>
          </dl>
          <Button href={`/games?game=${game}`} variant="secondary">See {g.name} contests</Button>
        </div>
      </div>
    </section>
  )
}
