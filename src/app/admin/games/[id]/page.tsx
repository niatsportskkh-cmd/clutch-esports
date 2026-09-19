import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { isGame } from '@/lib/games'
import { formatIst, utcToIstInput } from '@/lib/time'
import { getById, listTeamsFor, isRegOpen } from '@/lib/tournaments'
import { listBranches } from '@/lib/branches'
import { Button } from '@/components/Button'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Panel } from '@/components/Panel'
import { deleteTournamentAction, removeTeamAction } from '../../actions'
import { TournamentForm } from '../../TournamentForm'
import { RoomForm } from './RoomForm'
import { BackLink } from '@/components/BackLink'

export default async function ManageGame({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const t = await getById(id)
  if (!t) notFound()
  const [regs, colleges] = await Promise.all([listTeamsFor(t._id), listBranches()])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink href="/admin">Admin</BackLink>
        {isGame(t.game) && <Button href={`/games/${t.slug}`} variant="secondary">View public page</Button>}
      </div>
      <div>
        <p className="font-semibold text-accent">{t.gameName}</p>
        <h1 className="display mt-1 text-3xl sm:text-5xl">{t.title}</h1>
        {!isGame(t.game) && <p className="mt-3 max-w-[60ch] text-muted">This contest is for a game Clutch no longer offers, so players cannot see it. Pick one of the five below, or remove its teams and delete it.</p>}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="display text-2xl">Room details</h2>
        <p className="max-w-[60ch] text-muted">
          {t.room ? `Published ${formatIst(t.room.publishedAt)}. ` : 'Not published yet. '}
          Only players on a team in this contest can see these, on the game page and in My games.
          {!isRegOpen(t) && ' Registration is closed, so the rosters below are final.'}
        </p>
        <Panel inner="p-5 sm:p-7"><RoomForm id={id} room={t.room && { id: t.room.id, password: t.room.password, note: t.room.note }} /></Panel>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="display text-2xl">Teams <span className="num text-muted">{regs.length}</span></h2>
          <div className="flex gap-2">
            <Button href={`/admin/teams?tournamentId=${id}`} variant="ghost" className="px-4">In the teams table</Button>
            {/* a plain anchor: route handlers that send a file must not go through the client router */}
            <a href={`/admin/games/${id}/export`} className="inline-flex min-h-11 items-center rounded-full bg-white/[0.06] px-5 text-[0.95rem] font-semibold text-text ring-1 ring-inset ring-white/15 transition-colors duration-300 hover:bg-white/[0.12]">Export CSV</a>
          </div>
        </div>
        {regs.length === 0 && <p className="text-muted">No teams yet.</p>}
        <ol className="flex flex-col gap-3">
          {regs.map((r, i) => (
            <li key={r._id.toHexString()}>
              <Panel inner="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-text"><span className="num mr-2 text-muted">{i + 1}.</span>{r.teamName}</p>
                    <p className="text-sm text-accent">{r.branch}, {r.location}</p>
                    <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
                      <a className="underline underline-offset-4 hover:text-text" href={`https://wa.me/${r.phone.length === 10 ? `91${r.phone}` : r.phone}`} target="_blank" rel="noreferrer">WhatsApp {r.phone}</a>
                      <a className="underline underline-offset-4 hover:text-text" href={`mailto:${r.email}`}>{r.email}</a>
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-mono font-semibold text-accent">{r.code}</p>
                    <p className="text-muted">{formatIst(r.createdAt)}</p>
                  </div>
                </div>
                <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {r.players.map(p => (
                    <li key={p.collegeId} className="flex justify-between gap-3">
                      <span className="text-text">{p.name}{p.collegeId === r.captainCollegeId && <span className="ml-2 text-xs text-accent">captain</span>}</span>
                      <span className="font-mono text-muted">{t.requireInGameId && p.inGameId ? p.inGameId : p.collegeId}</span>
                    </li>
                  ))}
                </ul>
                <form action={removeTeamAction} className="self-start">
                  <input type="hidden" name="id" value={r._id.toHexString()} />
                  <ConfirmButton variant="danger" className="min-h-10 px-4 text-sm" message={`Remove ${r.teamName}? Its players are free to join another team in this contest.`}>Remove</ConfirmButton>
                </form>
              </Panel>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="display text-2xl">Game settings</h2>
        <Panel inner="p-5 sm:p-7">
          <TournamentForm id={id} locked={regs.length > 0} colleges={colleges.map(b => ({ name: b.name, location: b.location }))} initial={{
            game: isGame(t.game) ? t.game : 'freefire', title: t.title, mode: t.mode,
            startsAt: utcToIstInput(t.startsAt), regClosesAt: t.regClosesAt.getTime() === t.startsAt.getTime() ? '' : utcToIstInput(t.regClosesAt),
            branches: t.branches, requireInGameId: t.requireInGameId, rules: t.rules, prize: t.prize, status: t.status,
          }} />
        </Panel>
      </section>

      {regs.length === 0 && (
        <form action={deleteTournamentAction} className="self-start">
          <input type="hidden" name="id" value={id} />
          <ConfirmButton variant="danger" message={`Delete ${t.title} for good?`}>Delete this game</ConfirmButton>
        </form>
      )}
    </div>
  )
}
