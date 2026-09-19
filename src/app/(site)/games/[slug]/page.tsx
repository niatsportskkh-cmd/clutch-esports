import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { isAdmin } from '@/lib/users'
import { listBranches } from '@/lib/branches'
import { EXTERNAL_REGISTER, isGame, teamLabel } from '@/lib/games'
import { formatIst } from '@/lib/time'
import { getBySlug, isRegOpen, myTeam, visibleTo, teams as teamsCol } from '@/lib/tournaments'
import { AutoRefresh } from '@/components/AutoRefresh'
import { GameBanner } from '@/components/GameBanner'
import { Button } from '@/components/Button'
import { Countdown } from '@/components/Countdown'
import { GameIcon } from '@/components/GameIcon'
import { LoginGate } from '@/components/LoginGate'
import { RoomPanel } from '@/components/RoomPanel'
import { TeamCount } from '@/components/TeamCount'
import { SceneFocus, SceneStage, SceneTarget } from '@/components/scene/SceneTarget'
import { BackLink } from '@/components/BackLink'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getBySlug((await params).slug)
  return t ? { title: `${t.title}, ${t.gameName}`, description: `Free ${t.gameName} match on ${formatIst(t.startsAt)}. Open to ${t.branches.join(', ')}.` } : {}
}

export default async function GamePage({ params }: Props) {
  const { slug } = await params
  const [t, user] = await Promise.all([getBySlug(slug), getUser()])
  if (!user) return <LoginGate next={`/games/${slug}`} />
  // 404 rather than 403: a contest another college cannot enter should not even confirm it exists
  if (!t || !isGame(t.game) || (!visibleTo(t, user?.branch) && !isAdmin(user))) notFound()
  const [reg, teamsIn, colleges] = await Promise.all([
    user?.collegeId ? myTeam(t._id, user.collegeId) : null,
    teamsCol().countDocuments({ tournamentId: t._id, status: 'confirmed' }),
    listBranches(),
  ])
  const open = isRegOpen(t)
  const mine = user?.branch && t.branches.includes(user.branch)
  const locations = [...new Set(t.branches.map(b => colleges.find(c => c.name === b)?.location).filter(Boolean))]

  const facts = [
    ['Starts', formatIst(t.startsAt)],
    ['Format', teamLabel(t.teamSize)],
    ...(t.mode ? [['Mode', t.mode]] : []),
    ['Entry', 'Free'],
    ['Colleges', t.branches.join(', ')],
    ...(locations.length ? [['Where', locations.join(', ')]] : []),
    ...(t.prize ? [['Prize', t.prize]] : []),
  ]

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
      <SceneTarget shape={t.game} hue={null} />
      <AutoRefresh />

      <div className="flex flex-col gap-6 lg:col-span-2">
        <BackLink href="/games">All games</BackLink>
        <GameBanner game={t.game} className="mb-10 h-52 sm:h-64 lg:h-80" />
      </div>

      <div className="flex min-w-0 flex-col gap-10">
        <header className="rise flex flex-col items-start gap-5">
          <p style={{ '--i': 0 } as CSSProperties} className="flex items-center gap-2.5 font-semibold text-accent">
            <GameIcon game={t.game} size={26} /> {t.gameName}
          </p>
          <h1 style={{ '--i': 1 } as CSSProperties} className="display text-[clamp(2.4rem,8.5vw,4.5rem)]">{t.title}</h1>
          <p style={{ '--i': 2 } as CSSProperties} className="text-lg text-muted">
            {t.startsAt > new Date() ? <>Starts in <Countdown to={t.startsAt.toISOString()} className="font-semibold text-text" /></> : 'This match has started.'}
          </p>
          <div style={{ '--i': 3 } as CSSProperties} className="flex flex-wrap items-center gap-3">
            {reg ? (
              <>
                <span className="inline-flex min-h-11 items-center rounded-full bg-accent/15 px-5 font-semibold text-accent ring-1 ring-inset ring-accent/40">You&apos;re in</span>
                <span className="font-mono text-lg text-text">{reg.code}</span>
                <span className="text-muted">{reg.teamName}</span>
              </>
            ) : EXTERNAL_REGISTER[t.game] ? (
              <Button href={EXTERNAL_REGISTER[t.game]}>Register</Button>
            ) : (
              // signed out is not the same as wrong college: the visitor has no college yet, so send them to log in
              <Button href={`/games/${t.slug}/register`} disabled={!open || (!!user && !mine)}>
                {!open ? 'Registration closed' : !user ? 'Log in to register' : !mine ? 'Not open to your college' : 'Register free'}
              </Button>
            )}
          </div>
        </header>

        {reg && <RoomPanel room={t.room} />}

        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-text">{value}</dd>
            </div>
          ))}
        </dl>

        <SceneFocus shape="teams" hue={null} teams={teamsIn} className="flex flex-col gap-5">
          <h2 className="display text-2xl sm:text-3xl">Who is in</h2>
          <SceneStage className="h-[30dvh] min-h-52 lg:hidden" />
          <TeamCount teams={teamsIn} open={open} solo={t.teamSize === 1} className="max-w-md" />
          <p className="max-w-[52ch] text-muted">
            {t.teamSize > 1 ? `Teams of ${t.teamSize}, one college per team.` : 'Solo, one entry each.'} There is no cap: everyone who registers before {formatIst(t.regClosesAt)} plays.
          </p>
        </SceneFocus>

        {t.rules && (
          <section>
            <h2 className="display text-2xl sm:text-3xl">Rules</h2>
            <p className="mt-4 max-w-[62ch] whitespace-pre-line leading-relaxed text-muted">{t.rules}</p>
          </section>
        )}
      </div>

      <SceneStage className="sticky top-28 h-[calc(100dvh-10rem)] max-lg:hidden" />
    </div>
  )
}
