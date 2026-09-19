'use server'
import { db } from '@/lib/db'

/**
 * better-auth answers "wrong password" and "no such email" with one message, to stop anyone probing which
 * addresses have accounts. We trade that away so a mistyped email is not mistaken for a wrong password:
 * signing up already answers the same question ("user already exists"), so this leaks nothing new.
 */
export async function hasAccount(email: string) {
  if (typeof email !== 'string' || email.length > 200) return false
  const found = await db.collection('user').findOne({ email: email.trim().toLowerCase() }, { projection: { _id: 1 } })
  return !!found
}
