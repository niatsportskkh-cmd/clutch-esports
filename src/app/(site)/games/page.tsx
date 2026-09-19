import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { GAME, GAMES, isGame } from '@/lib/games'
import { openViews } from '@/lib/tournaments'
import { AutoRefresh } from '@/components/AutoRefresh'
import { BackLink } from '@/components/BackLink'
import { Button } from '@/components/Button'
import { GameCard } from '@/components/GameCard'
import { GameIcon } from '@/components/GameIcon'
import { LoginGate } from '@/components/LoginGate'
import { SceneTarget } from '@/components/scene/SceneTarget'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Games', description: 'Every free esports contest open for registration, soonest first.' }

const PER_PAGE = 12

type Search = { game?: string; page?: string }

export default async function GamesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { game: raw = '', page: rawPage = '1' } = await searchParams
  const game = isGame(raw) ? raw : '' // keyed by game, e.g. ?game=bgmi; anything else means every game
  const user = await getUser()
  if (!user) return <LoginGate next={game ? `/games?game=${game}` : '/games'} />
  // ponytail: loads every open contest and pages in memory, because the filter chips need the whole set anyway.
  // Open contests are a few dozen at most; move to skip/limit in listOpen if a college ever runs hundreds at once.
  const all = await openViews(user?.branch ?? null)
  const present = GAMES.filter(k => all.some(g => g.game === k)) // catalogue order, only games with something open
  const shown = game ? all.filter(g => g.game === game) : all
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE))
  const page = Math.min(pages, Math.max(1, Number(rawPage) || 1))
  const rows = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  // filter and page live in the URL, so a reload or a shared link lands on the same view
  const link = (over: Search) => {
    const p = new URLSearchParams({ ...(game ? { game } : {}), ...over } as Record<string, string>)
    if (p.get('page') === '1') p.delete('page')
    if (!p.get('game')) p.delete('game')
    return `/games${p.size ? `?${p}` : ''}`
  }
  const chip = 'inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold ring-1 ring-inset transition-colors duration-300'

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <SceneTarget shape="field" hue={null} />
      <AutoRefresh />

      <header className="flex flex-col items-start gap-3">
        <BackLink href="/">Home</BackLink>
        <h1 className="display text-4xl sm:text-5xl">Games</h1>
        <p className="num text-muted">
          {all.length === 0
            ? 'Nothing is open right now.'
            : `${all.length} ${all.length === 1 ? 'contest' : 'contests'} open${user?.branch ? ` for ${user.branch}` : ''}, soonest first. Entry is free.`}
        </p>
      </header>

      {/* only worth a row when there is something to choose between */}
      {present.length > 1 && (
        <nav aria-label="Filter by game" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {(['', ...present] as const).map(k => {
            const active = k === game
            return (
              <Link key={k || 'all'} href={link({ game: k, page: '1' })} aria-current={active ? 'page' : undefined}
                className={`${chip} ${active ? 'bg-accent text-ink ring-accent' : 'bg-white/[0.04] text-muted ring-line hover:text-text'}`}>
                {k && <GameIcon game={k} size={22} className="-ml-2" />}
                {k ? GAME[k].name : 'All'}
              </Link>
            )
          })}
        </nav>
      )}

      {all.length === 0 ? (
        <p className="max-w-[48ch] text-lg text-muted">
          {user?.branch
            ? `Contests show up here as soon as they are announced for ${user.branch}. Each game opens on its own, with its start time and registration deadline.`
            : 'New matches show up here as soon as they are announced. Each game opens on its own, with its start time and registration deadline.'}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-lg text-muted">No open {game && GAME[game].name} contests. <Link href="/games" className="text-text underline underline-offset-4">See every game</Link>.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map(g => <li key={g.slug} className="row-in"><GameCard game={g} /></li>)}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-4" aria-label="Pages">
          <Button href={link({ page: String(page - 1) })} variant="secondary" disabled={page <= 1} className="px-5">Back</Button>
          <p className="num text-sm text-muted">Page {page} of {pages}</p>
          <Button href={link({ page: String(page + 1) })} variant="secondary" disabled={page >= pages} className="px-5">Next</Button>
        </nav>
      )}
    </div>
  )
}
