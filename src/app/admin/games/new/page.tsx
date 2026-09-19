import { requireAdmin } from '@/lib/admin'
import { listBranches } from '@/lib/branches'
import { Panel } from '@/components/Panel'
import { TournamentForm } from '../../TournamentForm'
import { BackLink } from '@/components/BackLink'

export default async function NewGame() {
  await requireAdmin()
  const colleges = (await listBranches()).map(b => ({ name: b.name, location: b.location }))
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <BackLink href="/admin">Admin</BackLink>
      <h1 className="display text-4xl sm:text-5xl">Add game</h1>
      <Panel inner="p-5 sm:p-7">
        <TournamentForm id={null} locked={false} colleges={colleges} initial={{
          game: 'freefire', title: '', mode: '', startsAt: '', regClosesAt: '',
          branches: [], requireInGameId: true, rules: '', prize: '', status: 'open',
        }} />
      </Panel>
    </div>
  )
}
