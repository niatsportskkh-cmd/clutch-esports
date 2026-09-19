'use server'
import { ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { setPassword } from '@/lib/auth'
import { tournamentInput, roomInput, STATUSES, ROLES } from '@/lib/schemas'
import { saveTournament, deleteTournament, setStatus, setRoom, cancelTeam } from '@/lib/tournaments'
import { setRole } from '@/lib/users'

// Every export re-checks admin itself. The layout guard only protects rendering; actions are separate POST endpoints.
export type FormState = { ok: false; error: string; values?: Record<string, string> } | { ok: true; message: string } | null
const oid = (v: FormDataEntryValue | string | null) => (ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null)
const fresh = () => revalidatePath('/', 'layout')

export async function saveTournamentAction(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin()
  const values = { ...Object.fromEntries([...form].map(([k, v]) => [k, String(v)])), branches: form.getAll('branches').join('\n') }
  // checkboxes: absent when unticked, and `branches` is many values under one name
  const parsed = tournamentInput.safeParse({ ...values, branches: form.getAll('branches').map(String), requireInGameId: form.get('requireInGameId') === 'on' })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, values }
  const _id = id ? oid(id) : null
  if (id && !_id) return { ok: false, error: 'Bad id', values } // never fall through to "create" on a mangled id
  const res = await saveTournament(_id, parsed.data)
  if (!res.ok) return { ...res, values }
  fresh()
  if (!id) redirect(`/admin/games/${res.id.toHexString()}`)
  return { ok: true, message: 'Saved.' }
}

export async function setStatusAction(form: FormData) {
  await requireAdmin()
  const id = oid(form.get('id')), status = STATUSES.find(s => s === form.get('status'))
  if (id && status) { await setStatus(id, status); fresh() }
}

export async function publishRoomAction(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin()
  const _id = oid(id)
  if (!_id) return { ok: false, error: 'Bad id' }
  if (form.get('intent') === 'unpublish') { await setRoom(_id, null); fresh(); return { ok: true, message: 'Room details hidden from players.' } }
  const parsed = roomInput.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  await setRoom(_id, parsed.data)
  fresh()
  return { ok: true, message: 'Published. Registered players can see it now.' }
}

export async function removeTeamAction(form: FormData) {
  await requireAdmin()
  const id = oid(form.get('id'))
  if (id) { await cancelTeam(id, null); fresh() } // null: an admin is not bound by the registration deadline
}

export async function deleteTournamentAction(form: FormData) {
  await requireAdmin()
  const id = oid(form.get('id'))
  if (id && (await deleteTournament(id))) { fresh(); redirect('/admin') }
}

export async function setRoleAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin()
  const email = String(form.get('email') ?? '')
  const role = ROLES.find(r => r === form.get('role'))
  if (!role) return { ok: false, error: 'Pick a role', values: { email } }
  const res = await setRole(email, role, admin.id)
  if (!res.ok) {
    return {
      ok: false,
      error: res.error === 'self' ? 'You cannot change your own role. Ask another admin.' : 'No account with that email yet. They have to sign up first.',
      values: { email },
    }
  }
  fresh()
  return { ok: true, message: role === 'admin' ? `${res.email} is an admin now.` : `${res.email} is no longer an admin.` }
}

export async function setPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin()
  const who = String(form.get('who') ?? '').trim()
  const password = String(form.get('password') ?? '')
  if (!who) return { ok: false, error: 'Enter their email or NIAT ID', values: { who } }
  if (password.length < 8 || password.length > 128) return { ok: false, error: 'The new password needs 8 to 128 characters', values: { who } }
  const res = await setPassword(who, password, admin.id)
  if (!res.ok) {
    return {
      ok: false,
      error: res.error === 'self' ? 'Change your own password from My games.' : 'No account with that email or NIAT ID.',
      values: { who },
    }
  }
  return { ok: true, message: `Password changed for ${res.name} (${res.email}). They are signed out everywhere; send them the new one.` }
}

/** Revoking needs no form state: the page never renders the button for a case setRoleAction would reject. */
export async function revokeAdminAction(form: FormData) {
  await setRoleAction(null, form)
}
