import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { formatIst } from '@/lib/time'
import { listMine, isRegOpen } from '@/lib/tournaments'
import { AutoRefresh } from '@/components/AutoRefresh'
import { Button } from '@/components/Button'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Countdown } from '@/components/Countdown'
import { GameIcon } from '@/components/GameIcon'
import { Panel } from '@/components/Panel'
import { RoomPanel } from '@/components/RoomPanel'
import { SignOutButton } from '@/components/SignOutButton'
import { SceneTarget } from '@/components/scene/SceneTarget'
import { cancelAction } from './actions'
import { ChangePasswordForm } from './ChangePasswordForm'
import { BackLink } from '@/components/BackLink'

export const metadata = { title: 'My games' }

export default async function MePage() {
  const user = await getUser()
  if (!user) redirect('/login?next=/me')
  // matched on college ID, not on who filled the form: everyone on a team sees it here
  const mine = user.collegeId ? await listMine(user.collegeId) : []
  const now = new Date()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <SceneTarget shape="field" hue={null} />
      <AutoRefresh seconds={30} />
      <BackLink href="/">Home</BackLink>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl sm:text-5xl">My games</h1>
          <p className="mt-2 text-muted">Signed in as {user.email}{user.branch && <> · {user.branch}</>}</p>
        </div>
        {/* the nav drops Sign out on phones to stay on one row, so it lives here instead */}
        <SignOutButton className="inline-flex h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold text-muted ring-1 ring-inset ring-white/15 transition-colors duration-300 hover:text-text sm:hidden" />
      </header>

      {mine.length === 0 && (
        <Panel inner="flex flex-col items-start gap-4 p-6">
          <p className="text-lg text-text">You have not registered for anything yet.</p>
          <Button href="/games">See open games</Button>
        </Panel>
      )}

      {mine.map(({ team: reg, t }) => {
        const captain = reg.captainId === user.id
        const open = isRegOpen(t, now)
        const solo = t.teamSize === 1
        return (
        <article key={reg._id.toHexString()} className="flex flex-col gap-3">
          <Panel inner="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-accent"><GameIcon game={t.game} size={20} /> {t.gameName}</p>
                <h2 className="display mt-1.5 text-2xl"><Link href={`/games/${t.slug}`} className="hover:underline hover:underline-offset-4">{t.title}</Link></h2>
                <p className="mt-2 font-medium text-text">{formatIst(t.startsAt)}</p>
                {t.startsAt > now && <p className="text-sm text-muted">Starts in <Countdown to={t.startsAt.toISOString()} className="font-semibold text-text" /></p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm text-muted">Code</p>
                <p className="font-mono text-lg font-semibold text-accent">{reg.code}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 font-semibold text-text">
                {reg.teamName}
                <span className="ml-2 text-sm font-normal text-muted">{reg.branch}, {reg.location}</span>
                {!captain && <span className="ml-2 text-sm font-normal text-muted">· added by your captain</span>}
              </p>
              <ul className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {reg.players.map(p => (
                  <li key={p.collegeId} className="flex justify-between gap-3 border-b border-line/60 py-1.5 last:border-0 sm:[&:nth-last-child(2)]:border-0">
                    <span className="text-text">{p.name}{!solo && p.collegeId === reg.captainCollegeId && <span className="ml-2 text-xs text-accent">captain</span>}</span>
                    <span className="font-mono text-muted">{t.requireInGameId && p.inGameId ? p.inGameId : p.collegeId}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* only the captain edits or withdraws; members see the team and take it up with them */}
            {captain && open && (
              <div className="flex flex-wrap gap-2 self-start">
                <Button href={`/games/${t.slug}/register?edit=1`} variant="secondary" className="min-h-10 px-4 text-sm">{solo ? 'Edit entry' : 'Edit team'}</Button>
                <form action={cancelAction}>
                  <input type="hidden" name="id" value={reg._id.toHexString()} />
                  <ConfirmButton variant="danger" className="min-h-10 px-4 text-sm" message={solo ? `Withdraw from ${t.title}? You can register again while it is open.` : `Withdraw ${reg.teamName} from ${t.title}? Everyone on it is free to join another team.`}>Withdraw</ConfirmButton>
                </form>
              </div>
            )}
            {!captain && open && <p className="text-sm text-muted">Only {reg.players.find(p => p.collegeId === reg.captainCollegeId)?.name ?? 'the captain'} can change this team.</p>}
          </Panel>
          <RoomPanel room={t.room} />
        </article>
        )
      })}

      <section aria-labelledby="password" className="mt-8 flex flex-col gap-4">
        <h2 id="password" className="display text-2xl">Password</h2>
        <Panel inner="p-5 sm:p-7"><ChangePasswordForm /></Panel>
      </section>
    </div>
  )
}
