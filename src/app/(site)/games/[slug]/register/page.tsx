import type { CSSProperties } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { EXTERNAL_REGISTER, GAME, isGame, teamLabel } from '@/lib/games'
import { formatIst } from '@/lib/time'
import { getBySlug, isRegOpen, myTeam, visibleTo } from '@/lib/tournaments'
import { Button } from '@/components/Button'
import { GameBanner } from '@/components/GameBanner'
import { LoginGate } from '@/components/LoginGate'
import { Panel } from '@/components/Panel'
import { SceneStage, SceneTarget } from '@/components/scene/SceneTarget'
import { RegisterForm } from './RegisterForm'
import { BackLink } from '@/components/BackLink'

export const metadata = { title: 'Register' }

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ edit?: string; saved?: string }> }

export default async function RegisterPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { edit, saved } = await searchParams
  const t = await getBySlug(slug)
  if (!t || t.status === 'draft' || !isGame(t.game)) notFound()
  const external = EXTERNAL_REGISTER[t.game]
  if (external) redirect(external) // registration for this game happens on the partner site
  const user = await getUser()
  if (!user) return <LoginGate next={`/games/${slug}/register`} />
  if (!visibleTo(t, user.branch)) notFound() // another college's contest does not exist as far as this account is concerned

  const team = user.collegeId ? await myTeam(t._id, user.collegeId) : null
  const open = isRegOpen(t)
  if (!team && !open) redirect(`/games/${slug}`)

  // The captain may rewrite the roster until registration closes; a member sees the team but cannot.
  const editing = !!edit && !!team && open && team.captainId === user.id
  const done = team && !editing

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
      {done ? <SceneTarget shape="check" hue={null} burst /> : <SceneTarget shape={t.game} hue={null} />}

      <div className="flex flex-col gap-6 lg:col-span-2">
        <BackLink href={`/games/${slug}`}>{t.title}</BackLink>
        <GameBanner game={t.game} className="mb-10 h-44 sm:h-56" />
      </div>

      <div className="min-w-0">
        {done && <SceneStage className="h-[28dvh] min-h-48 lg:hidden" />}
        {done ? (
          <div className="rise flex flex-col items-start gap-6">
            {saved && (
              <p role="status" style={{ '--i': 0 } as CSSProperties} className="rounded-full bg-white/[0.08] px-4 py-2 text-sm font-semibold text-text ring-1 ring-inset ring-white/15">
                Changes saved.
              </p>
            )}
            <h1 style={{ '--i': 0 } as CSSProperties} className="display text-[clamp(2.6rem,9vw,4.75rem)]">You&apos;re in</h1>
            <p style={{ '--i': 1 } as CSSProperties} className="max-w-[50ch] text-lg text-muted">
              <span className="font-semibold text-text">{team.teamName}</span> is registered for{' '}
              <span className="font-semibold text-text">{t.title}</span>, {formatIst(t.startsAt)}, for {team.branch}.
            </p>
            <Panel style={{ '--i': 2 } as CSSProperties} inner="px-6 py-5">
              <p className="text-sm text-muted">Registration code</p>
              <p className="font-mono text-3xl font-semibold text-accent">{team.code}</p>
            </Panel>
            <ul style={{ '--i': 3 } as CSSProperties} className="flex w-full max-w-md flex-col gap-1">
              {team.players.map(p => (
                <li key={p.collegeId} className="flex justify-between gap-3 border-b border-line/60 py-2 last:border-0">
                  <span className="text-text">{p.name}{t.teamSize > 1 && p.collegeId === team.captainCollegeId && <span className="ml-2 text-xs text-accent">captain</span>}</span>
                  <span className="font-mono text-sm text-muted">{p.collegeId}</span>
                </li>
              ))}
            </ul>
            <p style={{ '--i': 4 } as CSSProperties} className="max-w-[50ch] text-muted">
              {t.teamSize === 1
                ? `The room ID and password appear in My games before the match.${open ? ' You can still change your entry until registration closes.' : ''}`
                : `Everyone above sees this team in their own My games. The room ID and password appear there before the match.${team.captainId === user.id && open ? ' As captain you can still swap players until registration closes.' : ''}`}
            </p>
            <div style={{ '--i': 5 } as CSSProperties} className="flex flex-wrap gap-3">
              {team.captainId === user.id && open && <Button href={`/games/${slug}/register?edit=1`}>{t.teamSize === 1 ? 'Edit entry' : 'Edit team'}</Button>}
              <Button href="/me" variant={team.captainId === user.id && open ? 'secondary' : 'primary'}>My games</Button>
              <Button href={`/games/${slug}`} variant="secondary">Game page</Button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-semibold text-accent">{t.gameName}, {teamLabel(t.teamSize).toLowerCase()}</p>
            <h1 className="display mt-2 text-[clamp(2rem,6.5vw,3.25rem)]">{editing ? (t.teamSize === 1 ? 'Edit your entry' : 'Edit your team') : t.title}</h1>
            <p className="mt-4 mb-10 max-w-[54ch] text-lg text-muted">
              {formatIst(t.startsAt)}. Registration closes {formatIst(t.regClosesAt)}, and there is no cap on {t.teamSize === 1 ? 'players' : 'teams'}.
              {editing && t.teamSize > 1 && ' Changes replace the whole roster.'}
            </p>
            <RegisterForm
              slug={slug} teamSize={t.teamSize} requireInGameId={t.requireInGameId} idHint={GAME[t.game].idHint}
              captainCollegeId={user.collegeId ?? ''} captainName={user.name} branch={user.branch ?? ''}
              teamId={editing ? team!._id.toHexString() : undefined}
              initial={editing ? { teamName: team!.teamName, collegeIds: team!.players.map(p => p.collegeId), inGameIds: team!.players.map(p => p.inGameId) } : undefined}
            />
          </>
        )}
      </div>

      <SceneStage className="sticky top-28 h-[calc(100dvh-10rem)] max-lg:hidden" />
    </div>
  )
}
