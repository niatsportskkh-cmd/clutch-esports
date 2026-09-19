import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { nextCookies } from 'better-auth/next-js'
import { APIError } from 'better-auth/api'
import { headers } from 'next/headers.js' // .js: node's own resolver (the tests) needs the extension; Next resolves it either way
import { db } from './db.ts'
import { signupGate } from './users.ts'

export const auth = betterAuth({
  // no `client` option: transactions stay off, so a standalone local Mongo works
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // No sendResetPassword: reset is off until it returns another way. Without it better-auth refuses its own
    // reset endpoint, so no route on this site can send mail.
  },
  // No emailVerification block: admin access is a role on the user document, so a verified
  // address gates nothing and the extra mail only trained people to ignore it.
  user: {
    additionalFields: {
      phone: { type: 'string', required: true },
      collegeId: { type: 'string', required: true },
      // Copied off the roster row, never typed: a student cannot put themselves in another branch.
      branch: { type: 'string', required: false, input: false },
      // `input: false` is the whole guard here: without it a sign-up POST could carry role: 'admin'.
      role: { type: 'string', required: false, defaultValue: 'user', input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // The gate lives in users.ts (see signupGate): the first account ever becomes the admin, and every
        // one after it must match the student roster. Running inside better-auth means every sign-up
        // route goes through it, not just our form.
        before: async user => {
          const gate = await signupGate(user as { phone?: unknown; collegeId?: unknown })
          if (!gate.ok) throw new APIError('BAD_REQUEST', { message: gate.message })
          return { data: { ...user, ...gate.fields } }
        },
      },
    },
  },
  plugins: [nextCookies()], // keep last
})

/**
 * An admin gives a player a new password: the site sends no email, so a forgotten password is fixed by a person.
 * `who` is an email or a college ID. It signs the player out everywhere, since someone else may know the old one.
 * An admin cannot use it on themselves; they change their own from My games, which asks for the current one.
 */
export async function setPassword(who: string, password: string, actorId: string) {
  const key = who.trim()
  const user = await db.collection('user').findOne(key.includes('@') ? { email: key.toLowerCase() } : { collegeId: key.toUpperCase() })
  if (!user) return { ok: false as const, error: 'not_found' as const }
  if (String(user._id) === actorId) return { ok: false as const, error: 'self' as const }
  const ctx = await auth.$context
  await ctx.internalAdapter.updatePassword(String(user._id), await ctx.password.hash(password))
  await ctx.internalAdapter.deleteUserSessions(String(user._id))
  return { ok: true as const, name: user.name as string, email: user.email as string }
}

export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}
