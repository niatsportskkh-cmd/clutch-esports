'use server'
import { ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { teamInput } from '@/lib/schemas'
import { adminEditTeam, type TeamError } from '@/lib/tournaments'

export type AdminTeamState = { ok: false; error: string; teamName: string; collegeIds: string[]; inGameIds: string[] } | { ok: true; message: string } | null

function message(e: TeamError): string {
  switch (e.code) {
    case 'not_found': return 'That team no longer exists.'
    case 'closed': return 'Registration is closed for this contest.'
    case 'no_college': return 'That team has no college on it.'
    case 'not_your_college': return `This contest is not open to ${e.branch}.`
    case 'bad_roster': return e.message
    case 'unknown_player': return `${e.collegeId} is not on the student list.`
    case 'wrong_college': return `${e.name} (${e.collegeId}) is from ${e.branch}, not this team's college.`
    case 'duplicate_player': return `${e.collegeId} is in the team twice.`
    case 'already_registered': return `${e.name} (${e.collegeId}) is already playing this contest for ${e.teamName}.`
    case 'duplicate_ign': return `Two players have the same in-game ID (${e.inGameId}). Every player needs their own.`
    case 'ign_taken': return `In-game ID ${e.inGameId} is already used by ${e.name} on ${e.teamName} in this contest.`
  }
}

export async function adminEditTeamAction(id: string, _prev: AdminTeamState, form: FormData): Promise<AdminTeamState> {
  await requireAdmin()
  const teamName = String(form.get('teamName') ?? '')
  const collegeIds = form.getAll('collegeId').map(String)
  const inGameIds = form.getAll('inGameId').map(String)
  const fail = (error: string): AdminTeamState => ({ ok: false, error, teamName, collegeIds, inGameIds })

  if (!ObjectId.isValid(id)) return fail('Bad id')
  const parsed = teamInput.safeParse({ teamName, players: collegeIds.map((collegeId, i) => ({ collegeId, inGameId: inGameIds[i] ?? '' })) })
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  const res = await adminEditTeam(new ObjectId(id), parsed.data)
  if (!res.ok) return fail(message(res.error))
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Saved.' }
}
