'use server'
import { ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/auth'
import { cancelTeam } from '@/lib/tournaments'

export async function cancelAction(form: FormData) {
  const user = await getUser()
  const id = String(form.get('id') ?? '')
  if (!user || !ObjectId.isValid(id)) return
  await cancelTeam(new ObjectId(id), user.id) // captain-only and the deadline are enforced inside
  revalidatePath('/', 'layout')
}
