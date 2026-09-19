import { db, ensureIndexes } from './db.ts'
import { collegeIdSchema, phoneSchema, type Role } from './schemas.ts'
import { findStudent } from './students.ts'

export type Account = {
  _id: unknown; name: string; email: string; phone: string
  collegeId?: string; branch?: string; role?: Role; roleSetAt?: Date
}

const users = () => db.collection<Account>('user')

/** The role lives on the user document. The first account ever is the admin; admins promote the rest. */
export const isAdmin = (u: { role?: string | null } | null | undefined) => u?.role === 'admin'

export const listByRole = (role: Role) => users().find({ role }).sort({ email: 1 }).toArray()

/**
 * actorId is the admin making the change. Nobody may edit their own role: it keeps the last admin
 * from demoting themselves into a panel only a database client can reopen.
 */
export async function setRole(email: string, role: Role, actorId: string) {
  const target = await users().findOne({ email: email.trim().toLowerCase() })
  if (!target) return { ok: false as const, error: 'not_found' as const }
  if (String(target._id) === actorId) return { ok: false as const, error: 'self' as const }
  await users().updateOne({ _id: target._id } as never, { $set: { role, roleSetBy: actorId, roleSetAt: new Date() } })
  return { ok: true as const, email: target.email, name: target.name }
}

export type SignupFields = { phone: string; collegeId: string; branch?: string; role?: 'admin' }
export type GateResult = { ok: true; fields: SignupFields } | { ok: false; message: string }

/**
 * Who may have an account. Every sign-up route runs through this, from better-auth's create hook.
 *
 * The very first account on an empty database becomes the admin and skips the student list: a fresh
 * deployment has no students loaded yet, so otherwise nobody could ever get in to load them. From the
 * second account on, the mobile number and college ID must both match one roster row.
 */
export async function signupGate(raw: { phone?: unknown; collegeId?: unknown }): Promise<GateResult> {
  const phone = phoneSchema.safeParse(raw.phone)
  if (!phone.success) return { ok: false, message: 'Enter a valid NIAT registered number' }
  const collegeId = collegeIdSchema.safeParse(raw.collegeId)
  if (!collegeId.success) return { ok: false, message: 'Enter a valid NIAT ID' }

  await ensureIndexes() // the unique index on user.collegeId is the race backstop for the duplicate check below

  // ponytail: two sign-ups racing on an empty database can both pass this. That is the same exposure as
  // someone else simply signing up first, which no lock would fix: sign up right after deploying, then
  // check /admin/people for anyone you do not recognise.
  if ((await users().countDocuments({}, { limit: 1 })) === 0) {
    // No branch: that is copied from a roster row, and the first admin is not on the roster.
    return { ok: true, fields: { phone: phone.data, collegeId: collegeId.data, role: 'admin' } }
  }

  const student = await findStudent(collegeId.data, phone.data)
  if (!student) {
    return { ok: false, message: 'That NIAT ID and NIAT registered number are not on the student list together. Check both, or ask the organisers to add you.' }
  }
  if (await users().findOne({ collegeId: collegeId.data })) {
    return { ok: false, message: 'An account already exists for this NIAT ID. Log in instead.' }
  }
  return { ok: true, fields: { phone: phone.data, collegeId: collegeId.data, branch: student.branch } }
}
