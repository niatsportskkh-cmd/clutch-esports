import type { CSSProperties } from 'react'
import Image from 'next/image'
import { getUser } from '@/lib/auth'
import { ART } from '@/lib/game-art'
import { GAME, GAMES } from '@/lib/games'
import { Button } from '@/components/Button'
import { GameChapter } from '@/components/GameChapter'
import { SceneStage, SceneTarget } from '@/components/scene/SceneTarget'

const STEPS = [
  ['Make an account', 'Sign up with your NIAT ID and the mobile number NIAT has on file for you. Both have to match the student list, and your college is filled in from it. No OTP, no email check.'],
  ['Find a contest', 'The Games page lists every contest open to your college, soonest first, with its start time and when registration closes. Each game opens on its own schedule.'],
  ['The captain registers the team', 'One person registers the whole team by typing each player’s NIAT ID and in-game ID. Names come from the student list, and everyone has to be from your college. Matiks is solo, so you register yourself.'],
  ['Get the room details', 'Your teammates see the team in My games once they sign up. Before the match starts, the room ID and password appear there and on the contest page.'],
]

const FAQ = [
  ['Who can play?', 'NIAT students on the student list. Each contest is open to certain colleges, and you only see the ones open to yours. Every player on a team has to be from the same college.'],
  ['Sign-up says I’m not on the student list.', 'Check that your NIAT ID and number are typed exactly as NIAT has them. If they still don’t match, ask the organisers to add or fix your record.'],
  ['Does it cost anything?', 'No. Entry is free, and this site never asks for payment. If a contest has a prize, it is listed on the contest page.'],
  ['Do my teammates need accounts?', 'Not to be registered: the captain adds them by NIAT ID. They need an account to see the team and the room details in My games.'],
  ['Why do you need my real in-game ID?', 'Organisers check in-game IDs against match results, and each ID can be used only once per contest. Enter the account you actually play on. A borrowed or made-up ID can get the team removed.'],
  ['Can we change the team after registering?', 'Yes, until registration closes. The captain can swap players or withdraw from My games. After the deadline the roster is locked.'],
  ['When do we get the room ID and password?', 'Shortly before the match starts, on the contest page and in My games. Only registered players can see them, so keep them within your team.'],
  ['I forgot my password.', 'This site doesn’t send email, so an organiser sets a new one for you. The login page has the address to write to.'],
  ['What can other players see about me?', 'Your teammates see your name, NIAT ID and in-game ID. Your phone number and email are never shown to them. Organisers see your details so they can run the contests.'],
]

// The five chapters vary their composition so the page never runs three identical splits in a row.
const LAYOUTS = { freefire: 'right', bgmi: 'left', codm: 'band', valorant: 'right', matiks: 'left' } as const

/** An introduction to the five games. No contests here: those, and registering, live on the Games page. */
export default async function Home() {
  const user = await getUser()
  return (
    <div className="flex flex-col">
      <SceneTarget shape="trophy" hue={null} />

      <section className="relative flex flex-col justify-between gap-12 lg:min-h-[calc(100dvh-8rem)]">
        <SceneStage className="pointer-events-none absolute top-0 right-0 hidden h-[58%] w-[42%] lg:block" />
        <div className="flex flex-col items-start gap-10 sm:gap-12">
          {/* "Clutch by NIAT", big and first: Clutch is NIAT's own event. Outside .rise, because it has its own entrance. */}
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="brand-in sheen" style={{ '--logo': 'url(/logo.png)' } as CSSProperties}>
              <Image src="/logo.png" alt="Clutch" width={480} height={177} priority className="h-16 w-auto sm:h-20 lg:h-24" />
            </span>
            <span className="brand-by text-2xl leading-none font-medium text-muted sm:text-3xl lg:text-4xl">by</span>
            <span className="brand-stamp sheen" style={{ '--logo': 'url(/brand/niat-shield.webp)' } as CSSProperties}>
              <Image src="/brand/niat-shield.webp" alt="NIAT" width={302} height={381} priority className="h-20 w-auto sm:h-28 lg:h-32" />
            </span>
          </div>

          <div className="rise flex max-w-3xl flex-col items-start gap-6">
            <h1 style={{ '--i': 4 } as CSSProperties} className="display text-[clamp(3.2rem,10vw,6.6rem)]">Five games. One campus arena.</h1>
            <p style={{ '--i': 5 } as CSSProperties} className="max-w-[44ch] text-lg leading-relaxed text-muted">
              Free inter-college contests in Free Fire MAX, BGMI, COD Mobile, Valorant and Matiks. Find yours on the Games page.
            </p>
            <div style={{ '--i': 6 } as CSSProperties} className="flex flex-wrap gap-3">
              <Button href="/games">Browse contests</Button>
              {user ? <Button href="/me" variant="secondary">My games</Button> : <Button href="/signup" variant="secondary">Sign up</Button>}
            </div>
          </div>
        </div>

        {/* The lineup: one character per game, each a link down to its chapter. The page's one big entrance. */}
        <div className="relative">
          <div aria-hidden className="absolute inset-x-[8%] bottom-4 h-28 bg-[radial-gradient(closest-side,rgb(255_26_26/0.32),transparent)]" />
          <ul className="lineup relative grid grid-cols-5 items-end">
            {GAMES.map((g, i) => (
              <li key={g} style={{ '--i': i } as CSSProperties} className="sm:-mx-2">
                <a href={`#${g}`} className="group flex flex-col items-center gap-3">
                  <span className="relative block h-44 w-full transition-transform duration-700 ease-spring group-hover:-translate-y-2 sm:h-72 lg:h-[23rem]">
                    {ART[g].cutout ? (
                      <Image src={ART[g].hero} alt="" fill sizes="(min-width: 1320px) 280px, 22vw" className="object-contain object-bottom" />
                    ) : (
                      <span className="absolute bottom-[6%] left-1/2 block aspect-[9/19.5] h-[78%] -translate-x-1/2 rotate-[6deg] overflow-clip rounded-[1.1rem] ring-4 ring-black sm:rounded-[1.6rem] sm:ring-[6px]">
                        <Image src={ART[g].hero} alt="" fill sizes="(min-width: 1024px) 180px, 18vw" className="object-cover object-top" />
                      </span>
                    )}
                  </span>
                  <span className="text-center text-xs font-semibold text-muted transition-colors duration-300 group-hover:text-text sm:text-sm">{GAME[g].name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {GAMES.map(g => <GameChapter key={g} game={g} layout={LAYOUTS[g]} />)}

      <section className="pt-16">
        <h2 className="display text-3xl sm:text-4xl">How it works</h2>
        <ol className="mt-8 flex flex-col gap-8">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-5">
              <span className="display num w-12 shrink-0 text-5xl text-accent">{i + 1}</span>
              <div>
                <h3 className="text-xl font-semibold text-text">{title}</h3>
                <p className="mt-1 max-w-[52ch] text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="pt-24">
        <h2 className="display text-3xl sm:text-4xl">Questions</h2>
        <div className="mt-8 flex max-w-3xl flex-col">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-line/60 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-text [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden className="text-2xl text-accent transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 max-w-[60ch] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
