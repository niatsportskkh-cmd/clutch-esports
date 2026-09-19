import { notFound } from 'next/navigation'
import { getUser } from './auth.ts'
import { isAdmin } from './users.ts'

export async function requireAdmin() {
  const user = await getUser()
  if (!isAdmin(user)) notFound() // 404, not 403: do not reveal that /admin exists
  return user!
}
