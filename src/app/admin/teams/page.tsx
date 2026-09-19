import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { listBranches, listLocations } from '@/lib/branches'
import { formatIst } from '@/lib/time'
import { listAll, listTeams } from '@/lib/tournaments'
import { Button } from '@/components/Button'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Panel } from '@/components/Panel'
import { removeTeamAction } from '../actions'
import { BackLink } from '@/components/BackLink'

export const metadata = { title: 'Teams' }

type Search = { tournamentId?: string; location?: string; branch?: string; q?: string; page?: string }

export default async function TeamsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin()
  const { tournamentId = '', location = '', branch = '', q = '', page: rawPage = '1' } = await searchParams
  const page = Math.max(1, Number(rawPage) || 1)
  const [{ rows, total, pages }, contests, colleges, locations] = await Promise.all([
    listTeams({ tournamentId, location, branch, q, page }),
    listAll(), listBranches(), listLocations(),
  ])
  const contestById = new Map(contests.map(t => [t._id.toHexString(), t]))
  // a location filter narrows the college list too, so the two dropdowns cannot contradict each other
  const collegeOptions = colleges.filter(c => !location || c.location === location)
  const link = (over: Partial<Search>) => {
    const p = new URLSearchParams({ ...(tournamentId ? { tournamentId } : {}), ...(location ? { location } : {}), ...(branch ? { branch } : {}), ...(q ? { q } : {}), ...over } as Record<string, string>)
    return `/admin/teams${p.size ? `?${p}` : ''}`
  }
  const control = 'h-11 appearance-none rounded-xl bg-ink/70 px-4 text-text ring-1 ring-inset ring-line outline-none focus:ring-2 focus:ring-accent'

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <BackLink href="/admin">Admin</BackLink>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Teams</h1>
        <p className="mt-3 max-w-[64ch] text-lg text-muted">
          Every team across every contest. College and location come from the captain&apos;s roster row, so filtering by them is exact.
        </p>
      </div>

      {/* a GET form: filters live in the URL, so a view can be reloaded, bookmarked or sent to someone */}
      <form className="flex flex-wrap items-end gap-2">
        <input name="q" defaultValue={q} placeholder="Team, player or NIAT ID" aria-label="Search teams"
          className={`${control} min-w-56 flex-1 placeholder:text-muted/80`} />
        <select name="tournamentId" defaultValue={tournamentId} aria-label="Filter by contest" className={control}>
          <option value="">Every contest</option>
          {contests.map(t => <option key={t._id.toHexString()} value={t._id.toHexString()}>{t.title}</option>)}
        </select>
        <select name="location" defaultValue={location} aria-label="Filter by location" className={control}>
          <option value="">Every location</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select name="branch" defaultValue={branch} aria-label="Filter by college" className={control}>
          <option value="">Every college</option>
          {collegeOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <Button type="submit" variant="secondary" className="px-5">Filter</Button>
        {(q || tournamentId || location || branch) && <Button href="/admin/teams" variant="ghost" className="px-4">Clear</Button>}
      </form>

      <p className="num text-muted">{total} {total === 1 ? 'team' : 'teams'}</p>
      {total === 0 && <p className="text-muted">Nothing matches those filters.</p>}

      <ul className="flex flex-col gap-3">
        {rows.map(team => {
          const t = contestById.get(team.tournamentId.toHexString())
          return (
            <li key={team._id.toHexString()}>
              <Panel inner="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{team.teamName}</p>
                    <p className="mt-1 text-sm text-accent">
                      {team.branch}, {team.location}
                      {t && <> · <Link href={`/admin/games/${team.tournamentId.toHexString()}`} className="underline underline-offset-4 hover:text-text">{t.title}</Link></>}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
                      <a className="underline underline-offset-4 hover:text-text" href={`https://wa.me/${team.phone.length === 10 ? `91${team.phone}` : team.phone}`} target="_blank" rel="noreferrer">WhatsApp {team.phone}</a>
                      <a className="underline underline-offset-4 hover:text-text" href={`mailto:${team.email}`}>{team.email}</a>
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-mono font-semibold text-accent">{team.code}</p>
                    <p className="text-muted">{formatIst(team.createdAt)}</p>
                  </div>
                </div>
                <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {team.players.map(p => (
                    <li key={p.collegeId} className="flex justify-between gap-3">
                      <span className="text-text">{p.name}{p.collegeId === team.captainCollegeId && <span className="ml-2 text-xs text-accent">captain</span>}</span>
                      <span className="font-mono text-muted">{p.collegeId}{t?.requireInGameId && p.inGameId ? ` · ${p.inGameId}` : ''}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  {t && <Button href={`/admin/teams/${team._id.toHexString()}`} variant="secondary" className="min-h-10 px-4 text-sm">Edit team</Button>}
                  <form action={removeTeamAction}>
                    <input type="hidden" name="id" value={team._id.toHexString()} />
                    <ConfirmButton variant="danger" className="min-h-10 px-4 text-sm" message={`Remove ${team.teamName}? Its players are free to join another team in this contest.`}>Remove</ConfirmButton>
                  </form>
                </div>
              </Panel>
            </li>
          )
        })}
      </ul>

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
