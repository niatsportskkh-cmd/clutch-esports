import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { formatIst } from '@/lib/time'
import { getTeam, getById } from '@/lib/tournaments'
import { Button } from '@/components/Button'
import { Panel } from '@/components/Panel'
import { TeamForm } from './TeamForm'
import { BackLink } from '@/components/BackLink'

export const metadata = { title: 'Edit team' }

export default async function EditTeam({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const team = await getTeam(id)
  if (!team) notFound()
  const t = await getById(team.tournamentId.toHexString())
  if (!t) notFound()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink href="/admin/teams">All teams</BackLink>
        <Button href={`/admin/games/${t._id.toHexString()}`} variant="secondary">Contest</Button>
      </div>
      <div>
        <p className="font-semibold text-accent">{t.title}</p>
        <h1 className="display mt-1 text-3xl sm:text-5xl">{team.teamName}</h1>
        <p className="mt-2 text-muted">
          {team.branch}, {team.location} · code <span className="font-mono text-accent">{team.code}</span> · registered {formatIst(team.createdAt)}
        </p>
      </div>
      <Panel inner="p-5 sm:p-7">
        <TeamForm id={id} teamSize={t.teamSize} requireInGameId={t.requireInGameId} branch={team.branch} captainCollegeId={team.captainCollegeId}
          initial={{ teamName: team.teamName, collegeIds: team.players.map(p => p.collegeId), inGameIds: team.players.map(p => p.inGameId) }} />
      </Panel>
    </div>
  )
}
