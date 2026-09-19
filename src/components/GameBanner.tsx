import Image from 'next/image'
import { ART } from '@/lib/game-art'
import type { Game } from '@/lib/games'
import { LoopVideo } from './LoopVideo'

/**
 * A game's own art in a frame: key art (or the publisher's loop), the character, the logo. The character stands in
 * the frame and breaks out above its top edge; the sides and bottom stay clipped to the frame.
 * `scroll` moves it as it scrolls into view (the home page); otherwise it animates once on load (contest pages,
 * where it is the first thing on screen). Decorative: the page says everything in text too.
 */
export function GameBanner({ game, scroll = false, sizes = '(min-width: 1320px) 1256px, 100vw', className = '' }: { game: Game; scroll?: boolean; sizes?: string; className?: string }) {
  const a = ART[game]
  const [artMotion, heroMotion] = scroll ? ['scroll-art', 'scroll-hero'] : ['push-in', 'hero-in']
  return (
    <div aria-hidden className={`relative isolate ${className}`}>
      {/* clip, not hidden: overflow:hidden makes a scroll container, and view() timelines inside it would never move */}
      <div className="absolute inset-0 overflow-clip rounded-[1.75rem] bg-surface ring-1 ring-white/10">
        <Image src={a.art} alt="" fill placeholder="blur" sizes={sizes} className={`${artMotion} object-cover`}
          {...(scroll ? {} : { loading: 'eager' as const, fetchPriority: 'high' as const })} />
        {a.loop && <LoopVideo src={a.loop} className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(5_5_5/0.92)_0%,rgb(5_5_5/0.45)_42%,transparent_70%),linear-gradient(0deg,rgb(5_5_5/0.85)_0%,transparent_50%)]" />
        {!a.cutout && (
          // no character: the game is its app, so show a real screen in a phone, tilted into the frame
          <div className={`${heroMotion} absolute top-[14%] right-[9%] aspect-[9/19.5] w-[30%] max-w-44 rotate-[7deg] overflow-clip rounded-[1.6rem] ring-[6px] ring-black shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)]`}>
            <Image src={a.hero} alt="" fill sizes="176px" className="object-cover object-top" />
          </div>
        )}
      </div>
      {a.cutout && (
        <div className="pointer-events-none absolute inset-0 [clip-path:inset(-45%_0_0_0_round_0_0_1.75rem_1.75rem)]">
          <div className={`${heroMotion} absolute right-[3%] bottom-0 h-[128%] w-[50%] sm:w-[40%]`}>
            <Image src={a.hero} alt="" fill sizes="(min-width: 1024px) 520px, 50vw" className="object-contain object-bottom" />
          </div>
        </div>
      )}
      <Image src={a.logo} alt="" sizes="(min-width: 640px) 360px, 200px"
        className="absolute bottom-5 left-5 h-auto max-h-14 w-auto max-w-[45%] sm:bottom-7 sm:left-7 sm:max-h-20 sm:max-w-[38%]" />
    </div>
  )
}
