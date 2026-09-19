import { ObjectId } from 'mongodb'
import { randomInt } from 'node:crypto'
import { db, ensureIndexes } from './db.ts'
import { getBranch, listBranches } from './branches.ts'
import { students } from './students.ts'
import { formatIst, istToUtc } from './time.ts'
import { GAME, GAMES, isGame, type Game } from './games.ts'
import type { Status, TournamentInput, TeamInput, RoomInput } from './schemas.ts'

export type Player = { collegeId: string; name: string; phone: string; inGameId: string }
export type Room = { id: string; password: string; note: string; publishedAt: Date }

export type Tournament = {
  _id: ObjectId; slug: string; game: Game; gameName: string; title: string; mode: string
  startsAt: Date; regClosesAt: Date; teamSize: number // gameName and teamSize are copied from GAME on save
  branches: string[]        // the colleges this contest is open to; nobody else sees it
  requireInGameId: boolean
  rules: string; prize: string; status: Status; room: Room | null; createdAt: Date; updatedAt: Date
}

/** A team belongs to exactly one college: its captain's. Branch and location are copied from the roster, never typed. */
export type Team = {
  _id: ObjectId; tournamentId: ObjectId; code: string; teamName: string
  captainId: string; captainCollegeId: string
  branch: string; location: string
  players: Player[]
  phone: string; email: string // the captain's, so the admin table and the CSV need no second lookup
  status: 'confirmed' | 'cancelled'; createdAt: Date; updatedAt: Date
}

export type SessionUser = { id: string; name: string; email: string; phone: string; collegeId?: string | null; branch?: string | null }

export type TeamError =
  | { code: 'not_found' }
  | { code: 'closed' }
  | { code: 'no_college' }
  | { code: 'not_your_college'; branch: string }
  | { code: 'bad_roster'; message: string }
  | { code: 'unknown_player'; collegeId: string }
  | { code: 'wrong_college'; name: string; collegeId: string; branch: string }
  | { code: 'duplicate_player'; collegeId: string }
  | { code: 'already_registered'; name: string; collegeId: string; teamName: string }
  | { code: 'duplicate_ign'; inGameId: string }
  | { code: 'ign_taken'; inGameId: string; name: string; teamName: string }

// In-game IDs match ignoring case (ICU strength 2: case-blind, accent-aware). The query collation and sameIgn are
// the same rule, so the database and the error message never disagree about what counts as a match.
const CI = { locale: 'en', strength: 2 } as const
const sameIgn = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'accent' }) === 0

export const tournaments = () => db.collection<Tournament>('tournaments')
export const teams = () => db.collection<Team>('teams')

export const isRegOpen = (t: Pick<Tournament, 'status' | 'regClosesAt'>, now = new Date()) =>
  t.status === 'open' && now < t.regClosesAt

/** A contest is only visible to the colleges it was opened to. Signed-out visitors see the public list. */
export const visibleTo = (t: Pick<Tournament, 'branches' | 'status'>, branch: string | null | undefined) =>
  t.status !== 'draft' && (!branch || t.branches.includes(branch))

/** Plain, serialisable shape for client components: never hand a Mongo document across the server/client boundary. */
export const toView = (t: Tournament, teamCount: number, locations: string[], now = new Date()) => ({
  slug: t.slug, game: t.game, gameName: t.gameName, title: t.title, mode: t.mode,
  startsAt: t.startsAt.toISOString(), startsLabel: formatIst(t.startsAt),
  teamSize: t.teamSize, teams: teamCount, locations, open: isRegOpen(t, now),
})
export type GameView = ReturnType<typeof toView>

export const listAll = () => tournaments().find().sort({ startsAt: -1 }).toArray()
export const getBySlug = (slug: string) => tournaments().findOne({ slug })
export const getById = async (id: string) => (ObjectId.isValid(id) ? tournaments().findOne({ _id: new ObjectId(id) }) : null)

/** `branch` null means a signed-out visitor: they get every open contest, and the college gate bites at registration. */
export const listOpen = (branch: string | null = null) =>
  tournaments()
    .find({ status: 'open', startsAt: { $gt: new Date() }, game: { $in: [...GAMES] }, ...(branch ? { branches: branch } : {}) })
    .sort({ startsAt: 1 })
    .toArray()

/** Open contests as cards, soonest first: team counts and each contest's cities filled in. Home and /games share it. */
export async function openViews(branch: string | null) {
  const open = await listOpen(branch)
  const [counts, colleges] = await Promise.all([countTeams(open.map(t => t._id)), listBranches()])
  const locationOf = new Map(colleges.map(b => [b.name, b.location]))
  return open.map(t =>
    toView(t, counts.get(t._id.toHexString()) ?? 0, [...new Set(t.branches.map(b => locationOf.get(b)).filter(Boolean) as string[])]),
  )
}

export async function countTeams(ids: ObjectId[]) {
  const rows = await teams().aggregate<{ _id: ObjectId; n: number }>([
    { $match: { tournamentId: { $in: ids }, status: 'confirmed' } },
    { $group: { _id: '$tournamentId', n: { $sum: 1 } } },
  ]).toArray()
  return new Map(rows.map(r => [r._id.toHexString(), r.n]))
}

/** Every team this person is on, captain or not: the roster is matched on their college ID. */
export async function listMine(collegeId: string) {
  const mine = await teams().find({ 'players.collegeId': collegeId, status: 'confirmed' }).sort({ createdAt: -1 }).toArray()
  const ts = await tournaments().find({ _id: { $in: mine.map(r => r.tournamentId) }, game: { $in: [...GAMES] } }).toArray() // a retired game's teams drop out
  const byId = new Map(ts.map(t => [t._id.toHexString(), t]))
  return mine.flatMap(team => {
    const t = byId.get(team.tournamentId.toHexString())
    return t ? [{ team, t }] : []
  })
}

export const myTeam = (tournamentId: ObjectId, collegeId: string) =>
  teams().findOne({ tournamentId, 'players.collegeId': collegeId, status: 'confirmed' })

export const listTeamsFor = (tournamentId: ObjectId) =>
  teams().find({ tournamentId, status: 'confirmed' }).sort({ createdAt: 1 }).toArray()

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
const newCode = () => 'CL-' + Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('')

/**
 * Turns the college IDs the captain typed into a roster, or says exactly which one is wrong.
 * Every player must be on the student list AND in the captain's own college — that is what makes
 * a team single-college by construction, so the admin's location and college filters cannot lie.
 */
async function buildRoster(t: Tournament, branch: string, mustInclude: string, input: TeamInput): Promise<{ ok: true; players: Player[] } | { ok: false; error: TeamError }> {
  const fail = (error: TeamError) => ({ ok: false as const, error })
  if (input.players.length !== t.teamSize) {
    return fail({ code: 'bad_roster', message: `This contest is played ${t.teamSize} to a team. Fill in all ${t.teamSize}.` })
  }

  const ids = input.players.map(p => p.collegeId)
  const dupe = ids.find((id, i) => ids.indexOf(id) !== i)
  if (dupe) return fail({ code: 'duplicate_player', collegeId: dupe })
  const igns = input.players.map(p => p.inGameId.trim()).filter(Boolean)
  const twin = igns.find((g, i) => igns.findIndex(h => sameIgn(g, h)) !== i)
  if (twin) return fail({ code: 'duplicate_ign', inGameId: twin })
  if (!ids.includes(mustInclude)) {
    return fail({ code: 'bad_roster', message: `The captain (${mustInclude}) has to stay on the team.` })
  }
  if (t.requireInGameId && input.players.some(p => !p.inGameId.trim())) {
    return fail({ code: 'bad_roster', message: 'This contest needs an in-game ID for every player.' })
  }

  const roster = await students().find({ collegeId: { $in: ids } }).toArray()
  const byId = new Map(roster.map(s => [s.collegeId, s]))
  for (const id of ids) {
    const s = byId.get(id)
    if (!s) return fail({ code: 'unknown_player', collegeId: id })
    if (s.branch !== branch) return fail({ code: 'wrong_college', name: s.name, collegeId: id, branch: s.branch })
  }

  return {
    ok: true,
    players: input.players.map(p => {
      const s = byId.get(p.collegeId)!
      return { collegeId: s.collegeId, name: s.name, phone: s.phone, inGameId: p.inGameId.trim() }
    }),
  }
}

/** Names the team a clashing player or in-game ID is already on, so the error is actionable instead of a dead end. */
async function findClash(tournamentId: ObjectId, players: Player[], exclude?: ObjectId): Promise<TeamError | null> {
  const others = { tournamentId, status: 'confirmed' as const, ...(exclude ? { _id: { $ne: exclude } } : {}) }
  const clash = await teams().findOne({ ...others, 'players.collegeId': { $in: players.map(p => p.collegeId) } })
  if (clash) {
    const who = clash.players.find(p => players.some(q => q.collegeId === p.collegeId))!
    return { code: 'already_registered', name: who.name, collegeId: who.collegeId, teamName: clash.teamName }
  }
  // ponytail: no unique index backs this, so two captains entering one in-game ID for two different students in the
  // same instant could both get in (the college-ID index still stops one person joining twice). If it ever happens,
  // add a unique index on (tournamentId, players.inGameId) with collation CI and a partial filter for non-empty IDs.
  const igns = players.map(p => p.inGameId).filter(Boolean)
  if (!igns.length) return null
  const taken = await teams().findOne({ ...others, 'players.inGameId': { $in: igns } }, { collation: CI })
  if (!taken) return null
  const who = taken.players.find(p => igns.some(g => sameIgn(g, p.inGameId)))!
  return { code: 'ign_taken', inGameId: who.inGameId, name: who.name, teamName: taken.teamName }
}

export type TeamResult = { ok: true; code: string } | { ok: false; error: TeamError }

export async function registerTeam(tournamentId: ObjectId, captain: SessionUser, input: TeamInput): Promise<TeamResult> {
  await ensureIndexes() // the unique index on players.collegeId is what makes the clash check race-safe
  const t = await tournaments().findOne({ _id: tournamentId })
  if (!t || !isGame(t.game)) return { ok: false, error: { code: 'not_found' } }
  if (!isRegOpen(t)) return { ok: false, error: { code: 'closed' } }

  if (!captain.collegeId || !captain.branch) return { ok: false, error: { code: 'no_college' } }
  if (!t.branches.includes(captain.branch)) return { ok: false, error: { code: 'not_your_college', branch: captain.branch } }
  const roster = await buildRoster(t, captain.branch, captain.collegeId, input)
  if (!roster.ok) return roster
  const clash = await findClash(tournamentId, roster.players)
  if (clash) return { ok: false, error: clash }

  const location = (await getBranch(captain.branch!))?.location ?? ''
  const code = newCode()
  const now = new Date()
  try {
    await teams().insertOne({
      _id: new ObjectId(), tournamentId, code, teamName: input.teamName,
      captainId: captain.id, captainCollegeId: captain.collegeId!, branch: captain.branch!, location,
      players: roster.players, phone: captain.phone, email: captain.email,
      status: 'confirmed', createdAt: now, updatedAt: now,
    })
    return { ok: true, code }
  } catch (e) {
    // Two captains submitting the same player at once: the index rejects the loser, and the message still names them.
    if ((e as { code?: number }).code === 11000) {
      return { ok: false, error: (await findClash(tournamentId, roster.players)) ?? { code: 'bad_roster', message: 'One of those players just joined another team.' } }
    }
    throw e
  }
}

/** The captain swaps players or renames the team, up to the moment registration closes. */
export async function editTeam(teamId: ObjectId, captain: SessionUser, input: TeamInput): Promise<TeamResult> {
  await ensureIndexes()
  const team = await teams().findOne({ _id: teamId, captainId: captain.id, status: 'confirmed' })
  if (!team) return { ok: false, error: { code: 'not_found' } }
  const t = await tournaments().findOne({ _id: team.tournamentId })
  if (!t || !isGame(t.game)) return { ok: false, error: { code: 'not_found' } }
  if (!isRegOpen(t)) return { ok: false, error: { code: 'closed' } }

  if (!captain.collegeId || !captain.branch) return { ok: false, error: { code: 'no_college' } }
  const roster = await buildRoster(t, team.branch, team.captainCollegeId, input)
  if (!roster.ok) return roster
  const clash = await findClash(team.tournamentId, roster.players, teamId)
  if (clash) return { ok: false, error: clash }

  try {
    await teams().updateOne({ _id: teamId }, { $set: { teamName: input.teamName, players: roster.players, updatedAt: new Date() } })
    return { ok: true, code: team.code }
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      return { ok: false, error: (await findClash(team.tournamentId, roster.players, teamId)) ?? { code: 'bad_roster', message: 'One of those players just joined another team.' } }
    }
    throw e
  }
}

/** The admin's own edit: the team keeps its college and captain, but no deadline applies. */
export async function adminEditTeam(teamId: ObjectId, input: TeamInput): Promise<TeamResult> {
  await ensureIndexes()
  const team = await teams().findOne({ _id: teamId, status: 'confirmed' })
  if (!team) return { ok: false, error: { code: 'not_found' } }
  const t = await tournaments().findOne({ _id: team.tournamentId })
  if (!t) return { ok: false, error: { code: 'not_found' } }

  const roster = await buildRoster(t, team.branch, team.captainCollegeId, input)
  if (!roster.ok) return roster
  const clash = await findClash(team.tournamentId, roster.players, teamId)
  if (clash) return { ok: false, error: clash }

  await teams().updateOne({ _id: teamId }, { $set: { teamName: input.teamName, players: roster.players, updatedAt: new Date() } })
  return { ok: true, code: team.code }
}

export const getTeam = async (id: string) => (ObjectId.isValid(id) ? teams().findOne({ _id: new ObjectId(id) }) : null)

/** userId = the captain withdrawing (deadline enforced); null = admin removal (no deadline). */
export async function cancelTeam(teamId: ObjectId, userId: string | null) {
  const filter = { _id: teamId, status: 'confirmed' as const, ...(userId ? { captainId: userId } : {}) }
  if (userId) {
    const team = await teams().findOne(filter)
    const t = team && (await tournaments().findOne({ _id: team.tournamentId }))
    if (!t || !isRegOpen(t)) return false
  }
  return !!(await teams().findOneAndUpdate(filter, { $set: { status: 'cancelled', updatedAt: new Date() } }))
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** One table across every contest: that is how an admin sorts by college, location or game in one place. */
export async function listTeams({ tournamentId = '', location = '', branch = '', q = '', page = 1, perPage = 50 } = {}) {
  const term = q.trim()
  const filter = {
    status: 'confirmed' as const,
    ...(tournamentId && ObjectId.isValid(tournamentId) ? { tournamentId: new ObjectId(tournamentId) } : {}),
    ...(location ? { location } : {}),
    ...(branch ? { branch } : {}),
    ...(term ? { $or: [{ teamName: { $regex: escape(term), $options: 'i' } }, { 'players.name': { $regex: escape(term), $options: 'i' } }, { 'players.collegeId': { $regex: escape(term), $options: 'i' } }] } : {}),
  }
  const [rows, total] = await Promise.all([
    teams().find(filter).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage).toArray(),
    teams().countDocuments(filter),
  ])
  return { rows, total, pages: Math.max(1, Math.ceil(total / perPage)) }
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'game'
const SUFFIX_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'
const suffix = () => Array.from({ length: 4 }, () => SUFFIX_CHARS[randomInt(SUFFIX_CHARS.length)]).join('')

export async function saveTournament(id: ObjectId | null, input: TournamentInput) {
  await ensureIndexes()
  const { startsAt, regClosesAt, ...rest } = input
  const starts = istToUtc(startsAt)
  const closes = regClosesAt ? istToUtc(regClosesAt) : starts
  if (closes > starts) return { ok: false as const, error: 'Registration must close before the game starts' }
  const { name: gameName, teamSize } = GAME[input.game]
  const fields = { ...rest, gameName, teamSize, startsAt: starts, regClosesAt: closes, updatedAt: new Date() }

  if (!id) {
    const _id = new ObjectId()
    const slug = `${slugify(input.title)}-${suffix()}`
    await tournaments().insertOne({ _id, slug, ...fields, room: null, createdAt: new Date() })
    return { ok: true as const, id: _id, slug }
  }

  // The game (and with it the team size) is locked once anyone has registered, and a college cannot be dropped while
  // it has teams: both would strand real registrations. Checked here rather than in the filter, so each gets its own message.
  const registered = await teams().find({ tournamentId: id, status: 'confirmed' }, { projection: { branch: 1 } }).toArray()
  if (registered.length) {
    const current = await tournaments().findOne({ _id: id })
    if (current && (current.game !== input.game || current.teamSize !== teamSize)) {
      return { ok: false as const, error: 'The game is locked once teams have registered.' }
    }
    const stranded = [...new Set(registered.map(r => r.branch))].filter(b => !input.branches.includes(b))
    if (stranded.length) return { ok: false as const, error: `${stranded.join(', ')} already ${stranded.length > 1 ? 'have' : 'has'} teams in this contest. Remove those teams first.` }
  }

  const updated = await tournaments().findOneAndUpdate({ _id: id }, { $set: fields }, { returnDocument: 'after' })
  if (!updated) return { ok: false as const, error: 'That contest no longer exists' }
  return { ok: true as const, id, slug: updated.slug }
}

export async function deleteTournament(id: ObjectId) {
  const registered = await teams().countDocuments({ tournamentId: id, status: 'confirmed' }, { limit: 1 })
  if (registered) return false
  await tournaments().deleteOne({ _id: id })
  await teams().deleteMany({ tournamentId: id })
  return true
}

export const setStatus = (id: ObjectId, status: Status) =>
  tournaments().updateOne({ _id: id }, { $set: { status, updatedAt: new Date() } })

export const setRoom = (id: ObjectId, room: RoomInput | null) =>
  tournaments().updateOne({ _id: id }, { $set: { room: room && { ...room, publishedAt: new Date() }, updatedAt: new Date() } })
