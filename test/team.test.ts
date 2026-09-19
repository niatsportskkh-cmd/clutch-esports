import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { getClient, db } from '../src/lib/db.ts'
import { saveBranch } from '../src/lib/branches.ts'
import { saveStudent } from '../src/lib/students.ts'
import { registerTeam, editTeam, adminEditTeam, cancelTeam, saveTournament, deleteTournament, tournaments, teams, listMine, listOpen, listTeams, visibleTo } from '../src/lib/tournaments.ts'
import { tournamentInput } from '../src/lib/schemas.ts'

const KKH = 'KKH', VJ = 'Vignana Jyothi'

/** Roster rows are the source of every name and number, so the fixtures start there. */
async function student(n: number, branch = KKH) {
  const collegeId = `2203A5${String(1000 + n).padStart(4, '0')}`
  await saveStudent({ collegeId, name: `Player ${n}`, phone: `9${String(100000000 + n).padStart(9, '0')}`, branch })
  return collegeId
}
const captain = (collegeId: string, branch = KKH, id = `u-${collegeId}`) =>
  ({ id, name: 'Cap', email: `${collegeId}@t.dev`, phone: '9000000000', collegeId, branch })

const roster = (ids: string[]) => ({ teamName: 'Team', players: ids.map(collegeId => ({ collegeId, inGameId: `ign-${collegeId}` })) })

// Inserted directly, so teamSize 2 keeps rosters short. saveTournament would make BGMI a squad of 4.
async function contest(over: Record<string, unknown> = {}) {
  const _id = new ObjectId()
  await tournaments().insertOne({
    _id, slug: _id.toHexString(), game: 'bgmi', gameName: 'BGMI', title: 'T', mode: '',
    startsAt: new Date(Date.now() + 864e5), regClosesAt: new Date(Date.now() + 864e5),
    teamSize: 2, branches: [KKH, VJ], requireInGameId: true,
    rules: '', prize: '', status: 'open', room: null, createdAt: new Date(), updatedAt: new Date(), ...over,
  } as never)
  return _id
}

const form = (game: 'freefire' | 'bgmi' | 'codm' | 'valorant' | 'matiks') => ({
  game, title: 'Test Cup', mode: '', startsAt: '2030-01-01T20:00', regClosesAt: '', requireInGameId: true, rules: '', prize: '', status: 'open' as const,
})

before(async () => {
  assert.match(db.databaseName, /test/)
  await db.dropDatabase()
  await saveBranch({ name: KKH, location: 'Hyderabad' })
  await saveBranch({ name: VJ, location: 'Hyderabad' })
  await saveBranch({ name: 'SR University', location: 'Warangal' })
})
after(() => getClient().close())

test('a team takes its college and location from the captain, not from the form', async () => {
  const c = await contest()
  const [a, b] = [await student(1), await student(2)]
  assert.deepEqual(await registerTeam(c, captain(a), roster([a, b])), { ok: true, code: (await teams().findOne({ tournamentId: c }))!.code })
  const team = (await teams().findOne({ tournamentId: c }))!
  assert.equal(team.branch, KKH)
  assert.equal(team.location, 'Hyderabad')
  assert.deepEqual(team.players.map(p => p.name), ['Player 1', 'Player 2']) // names came from the roster
  assert.equal(team.players[0].phone, '9100000001')
})

test('a player from another college is refused by name', async () => {
  const c = await contest()
  const [a, outsider] = [await student(10), await student(11, VJ)]
  const res = await registerTeam(c, captain(a), roster([a, outsider]))
  assert.deepEqual(res, { ok: false, error: { code: 'wrong_college', name: 'Player 11', collegeId: outsider, branch: VJ } })
  assert.equal(await teams().countDocuments({ tournamentId: c }), 0)
})

test('a college ID nobody has is refused by number', async () => {
  const c = await contest()
  const a = await student(20)
  const res = await registerTeam(c, captain(a), roster([a, '2203A59999']))
  assert.deepEqual(res, { ok: false, error: { code: 'unknown_player', collegeId: '2203A59999' } })
})

test('a contest the college was not invited to is refused', async () => {
  const c = await contest({ branches: [VJ] })
  const [a, b] = [await student(30), await student(31)]
  assert.deepEqual(await registerTeam(c, captain(a), roster([a, b])), { ok: false, error: { code: 'not_your_college', branch: KKH } })
  assert.equal(visibleTo({ branches: [VJ], status: 'open' }, KKH), false)
  assert.equal(visibleTo({ branches: [VJ], status: 'open' }, VJ), true)
  assert.equal(visibleTo({ branches: [VJ], status: 'open' }, null), true) // signed out: the public list
})

test('one person plays a contest once, even on someone else\'s team', async () => {
  const c = await contest()
  const [a, shared, d] = [await student(40), await student(41), await student(42)]
  assert.equal((await registerTeam(c, captain(a), roster([a, shared]))).ok, true)

  const res = await registerTeam(c, captain(d), roster([d, shared]))
  assert.deepEqual(res, { ok: false, error: { code: 'already_registered', name: 'Player 41', collegeId: shared, teamName: 'Team' } })
  assert.equal(await teams().countDocuments({ tournamentId: c, status: 'confirmed' }), 1)
})

test('the same person plays a different contest freely', async () => {
  const [c1, c2] = [await contest(), await contest()]
  const [a, b] = [await student(50), await student(51)]
  assert.equal((await registerTeam(c1, captain(a), roster([a, b]))).ok, true)
  assert.equal((await registerTeam(c2, captain(a), roster([a, b]))).ok, true)
})

test('concurrent captains cannot both claim the same player', async () => {
  const c = await contest()
  const shared = await student(60)
  const others = await Promise.all([61, 62, 63, 64, 65].map(n => student(n)))
  const results = await Promise.all(others.map(o => registerTeam(c, captain(o), roster([o, shared]))))
  assert.equal(results.filter(r => r.ok).length, 1) // the unique index settles the race
  assert.equal(await teams().countDocuments({ tournamentId: c, status: 'confirmed' }), 1)
})

test('there is no cap: any number of teams get in', async () => {
  const c = await contest()
  const ids = await Promise.all(Array.from({ length: 24 }, (_, i) => student(100 + i)))
  const pairs = Array.from({ length: 12 }, (_, i) => [ids[i * 2], ids[i * 2 + 1]])
  const results = await Promise.all(pairs.map(([x, y]) => registerTeam(c, captain(x), roster([x, y]))))
  assert.equal(results.filter(r => r.ok).length, 12)
})

test('the captain edits until registration closes, and nobody else ever does', async () => {
  const c = await contest()
  const [a, b, sub] = [await student(70), await student(71), await student(72)]
  await registerTeam(c, captain(a), roster([a, b]))
  const team = (await teams().findOne({ tournamentId: c }))!

  assert.deepEqual(await editTeam(team._id, captain(b, KKH, 'u-not-captain'), roster([a, sub])), { ok: false, error: { code: 'not_found' } })
  assert.equal((await editTeam(team._id, captain(a), { teamName: 'Renamed', players: [a, sub].map(collegeId => ({ collegeId, inGameId: `x-${collegeId}` })) })).ok, true)

  const after = (await teams().findOne({ _id: team._id }))!
  assert.equal(after.teamName, 'Renamed')
  assert.deepEqual(after.players.map(p => p.collegeId), [a, sub])
  assert.equal((await registerTeam(c, captain(b, KKH, 'u-b'), roster([b, await student(73)]))).ok, true) // the dropped player is free again

  await tournaments().updateOne({ _id: c }, { $set: { regClosesAt: new Date(Date.now() - 1000) } })
  assert.deepEqual(await editTeam(team._id, captain(a), roster([a, b])), { ok: false, error: { code: 'closed' } })
})

test('the captain cannot drop themselves, but an admin edits past the deadline', async () => {
  const c = await contest({ regClosesAt: new Date(Date.now() - 1000) })
  await tournaments().updateOne({ _id: c }, { $set: { regClosesAt: new Date(Date.now() + 864e5) } })
  const [a, b, sub] = [await student(80), await student(81), await student(82)]
  await registerTeam(c, captain(a), roster([a, b]))
  const team = (await teams().findOne({ tournamentId: c }))!

  const self = await editTeam(team._id, captain(a), roster([b, sub]))
  assert.equal(self.ok, false)
  assert.match((self as { error: { message: string } }).error.message, /captain/)

  await tournaments().updateOne({ _id: c }, { $set: { regClosesAt: new Date(Date.now() - 1000) } })
  assert.equal((await adminEditTeam(team._id, roster([a, sub]))).ok, true) // no deadline for an admin
  assert.equal((await adminEditTeam(team._id, roster([a, await student(83, VJ)]))).ok, false) // still single-college
})

test('everyone on the team sees it, matched on college ID', async () => {
  const c = await contest()
  const [a, b] = [await student(90), await student(91)]
  await registerTeam(c, captain(a), roster([a, b]))
  assert.equal((await listMine(a)).length, 1)
  assert.equal((await listMine(b)).length, 1) // the member never filled a form
  assert.equal((await listMine(await student(92))).length, 0)
})

test('withdrawing frees the players and hides the team', async () => {
  const c = await contest()
  const [a, b] = [await student(200), await student(201)]
  await registerTeam(c, captain(a), roster([a, b]))
  const team = (await teams().findOne({ tournamentId: c }))!

  assert.equal(await cancelTeam(team._id, 'u-someone-else'), false)
  assert.equal(await cancelTeam(team._id, `u-${a}`), true)
  assert.equal(await cancelTeam(team._id, `u-${a}`), false) // already gone
  assert.equal((await listMine(b)).length, 0)
  assert.equal((await registerTeam(c, captain(b, KKH, 'u-b2'), roster([b, a]))).ok, true) // both are free again
})

test('the admin table filters by contest, college and location, and searches players', async () => {
  const c = await contest({ branches: [KKH, VJ] })
  const [a, b] = [await student(300), await student(301)]
  const [x, y] = [await student(302, VJ), await student(303, VJ)]
  await registerTeam(c, captain(a), { teamName: 'Falcons', players: [a, b].map(collegeId => ({ collegeId, inGameId: `i-${collegeId}` })) })
  await registerTeam(c, captain(x, VJ), { teamName: 'Ravens', players: [x, y].map(collegeId => ({ collegeId, inGameId: `i-${collegeId}` })) })

  assert.equal((await listTeams({ tournamentId: c.toHexString() })).total, 2)
  assert.deepEqual((await listTeams({ tournamentId: c.toHexString(), branch: VJ })).rows.map(r => r.teamName), ['Ravens'])
  assert.equal((await listTeams({ tournamentId: c.toHexString(), location: 'Hyderabad' })).total, 2)
  assert.equal((await listTeams({ tournamentId: c.toHexString(), location: 'Warangal' })).total, 0)
  assert.deepEqual((await listTeams({ q: 'falcon' })).rows.map(r => r.teamName), ['Falcons'])
  assert.deepEqual((await listTeams({ q: 'Player 303' })).rows.map(r => r.teamName), ['Ravens'])
  assert.equal((await listTeams({ q: 'a(b' })).total, 0) // unescaped, this would throw
})

test('the contest form cannot carry a team size or a game name', () => {
  const parsed = tournamentInput.parse({ ...form('bgmi'), branches: [KKH], teamSize: '9', gameName: 'Fake' })
  assert.equal('teamSize' in parsed, false)
  assert.equal('gameName' in parsed, false)
})

test('team size and name come from the game, and a retired game is hidden from players', async () => {
  const made = await saveTournament(null, { ...form('valorant'), branches: [KKH] })
  const t = (await tournaments().findOne({ _id: (made as { id: ObjectId }).id }))!
  assert.deepEqual([t.gameName, t.teamSize], ['Valorant', 5])
  const solo = await saveTournament(null, { ...form('matiks'), branches: [KKH] })
  assert.equal((await tournaments().findOne({ _id: (solo as { id: ObjectId }).id }))!.teamSize, 1)

  const retired = await contest({ game: 'custom', gameName: 'Code Sprint' })
  const open = (await listOpen()).map(x => x._id.toHexString())
  assert.equal(open.includes(retired.toHexString()), false)
  assert.equal(open.includes(t._id.toHexString()), true)
  const [a, b] = [await student(600), await student(601)]
  assert.deepEqual(await registerTeam(retired, captain(a), roster([a, b])), { ok: false, error: { code: 'not_found' } })
})

test('contest edits cannot strand teams that already registered', async () => {
  const made = await saveTournament(null, { ...form('bgmi'), branches: [KKH, VJ] })
  const c = (made as { id: ObjectId }).id
  const squad = await Promise.all([400, 401, 402, 403].map(n => student(n)))
  assert.equal((await registerTeam(c, captain(squad[0]), roster(squad))).ok, true)

  assert.match((await saveTournament(c, { ...form('valorant'), branches: [KKH, VJ] }) as { error: string }).error, /game is locked/)
  assert.match((await saveTournament(c, { ...form('bgmi'), branches: [VJ] }) as { error: string }).error, /KKH already has teams/)
  assert.equal((await saveTournament(c, { ...form('bgmi'), branches: [KKH] })).ok, true) // dropping an unused college is fine
  assert.equal(await deleteTournament(c), false) // teams registered
  await cancelTeam((await teams().findOne({ tournamentId: c }))!._id, null)
  assert.equal(await deleteTournament(c), true)
})

test('two players on one team cannot share an in-game ID, whatever the case', async () => {
  const c = await contest()
  const [a, b] = [await student(500), await student(501)]
  const res = await registerTeam(c, captain(a), { teamName: 'Twins', players: [{ collegeId: a, inGameId: 'Ace#IN1' }, { collegeId: b, inGameId: 'ace#in1' }] })
  assert.deepEqual(res, { ok: false, error: { code: 'duplicate_ign', inGameId: 'ace#in1' } })
  assert.equal(await teams().countDocuments({ tournamentId: c }), 0)
})

test('an in-game ID already used on another team in the contest is refused by name', async () => {
  const c = await contest()
  const [a, b, x, y] = [await student(510), await student(511), await student(512), await student(513)]
  await registerTeam(c, captain(a), { teamName: 'Falcons', players: [{ collegeId: a, inGameId: 'Shadow' }, { collegeId: b, inGameId: 'b1' }] })
  const res = await registerTeam(c, captain(x), { teamName: 'Ravens', players: [{ collegeId: x, inGameId: 'x1' }, { collegeId: y, inGameId: 'SHADOW' }] })
  assert.deepEqual(res, { ok: false, error: { code: 'ign_taken', inGameId: 'Shadow', name: 'Player 510', teamName: 'Falcons' } })

  // the captain edit and the admin edit run the same check
  const [p, q] = [await student(514), await student(515)]
  await registerTeam(c, captain(p), { teamName: 'Owls', players: [{ collegeId: p, inGameId: 'p1' }, { collegeId: q, inGameId: 'q1' }] })
  const owls = (await teams().findOne({ tournamentId: c, teamName: 'Owls' }))!
  const clash = { teamName: 'Owls', players: [{ collegeId: p, inGameId: 'p1' }, { collegeId: q, inGameId: 'shadow' }] }
  assert.equal(((await editTeam(owls._id, captain(p), clash)) as { error: { code: string } }).error.code, 'ign_taken')
  assert.equal(((await adminEditTeam(owls._id, clash)) as { error: { code: string } }).error.code, 'ign_taken')
})

test('the same in-game ID is fine in another contest and when a team re-saves itself', async () => {
  const [c1, c2] = [await contest(), await contest()]
  const [a, b] = [await student(520), await student(521)]
  const r = { teamName: 'Team', players: [{ collegeId: a, inGameId: 'Mav' }, { collegeId: b, inGameId: 'Goose' }] }
  assert.equal((await registerTeam(c1, captain(a), r)).ok, true)
  assert.equal((await registerTeam(c2, captain(a), r)).ok, true)
  const team = (await teams().findOne({ tournamentId: c1 }))!
  assert.equal((await editTeam(team._id, captain(a), { ...r, teamName: 'Renamed' })).ok, true)
  assert.equal((await adminEditTeam(team._id, r)).ok, true)
})
