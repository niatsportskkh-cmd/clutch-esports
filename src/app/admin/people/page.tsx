import { requireAdmin } from '@/lib/admin'
import { formatIst } from '@/lib/time'
import { listByRole } from '@/lib/users'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Panel } from '@/components/Panel'
import { revokeAdminAction } from '../actions'
import { PromoteForm } from './PromoteForm'
import { PasswordForm } from './PasswordForm'
import { BackLink } from '@/components/BackLink'

export const metadata = { title: 'Admins and passwords' }

export default async function PeoplePage() {
  const me = await requireAdmin()
  const admins = await listByRole('admin')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div>
        <BackLink href="/admin">Admin</BackLink>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Admins and passwords</h1>
        <p className="mt-3 max-w-[60ch] text-lg text-muted">
          Admins manage every game and every team, and can make other people admins. Everyone else is a player.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="display text-2xl">Who has the panel</h2>
        <ul className="flex flex-col gap-3">
          {admins.map(a => {
            const isMe = String(a._id) === me.id
            return (
              <li key={String(a._id)}>
                <Panel inner="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <p className="font-semibold text-text">
                      {a.name}
                      {isMe && <span className="ml-2 text-sm font-normal text-muted">That is you</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{a.email}</p>
                  </div>
                  <p className="text-sm text-muted">{a.roleSetAt ? `Since ${formatIst(a.roleSetAt)}` : 'Founding admin'}</p>
                  {/* no self-revoke: the last admin must not be able to lock the panel behind a database client */}
                  {!isMe && (
                    <form action={revokeAdminAction}>
                      <input type="hidden" name="email" value={a.email} />
                      <input type="hidden" name="role" value="user" />
                      <ConfirmButton variant="danger" className="min-h-10 px-4 text-sm" message={`Remove admin from ${a.email}? They keep their account and their teams.`}>
                        Remove admin
                      </ConfirmButton>
                    </form>
                  )}
                </Panel>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="display text-2xl">Make someone an admin</h2>
        <Panel inner="p-5 sm:p-7"><PromoteForm /></Panel>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="display text-2xl">Change a player&apos;s password</h2>
          <p className="mt-1 max-w-[60ch] text-muted">When someone forgets theirs, the login page tells them to email the organisers. Set a new one here and send it to them.</p>
        </div>
        <Panel inner="p-5 sm:p-7"><PasswordForm /></Panel>
      </section>
    </div>
  )
}
