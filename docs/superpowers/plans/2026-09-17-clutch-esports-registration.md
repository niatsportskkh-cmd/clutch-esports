# Clutch Esports Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A free-registration esports site where players sign up, browse open games with IST times and live slots, and register solo or as a team; an admin adds and runs games from a panel; a morphing particle swarm in three.js sits behind every page.

**Architecture:** Next.js App Router. A pure data layer in `src/lib` (MongoDB driver + zod, no Next imports) holds all rules and is tested with `node --test`. Server Actions do auth, call the data layer, and revalidate. better-auth owns accounts. One `<canvas>` in the root layout runs an imperative three.js swarm controlled through a module-level store.

**Tech Stack:** Next 16.3, React 19.3, TypeScript, Tailwind 4, three 0.186, mongodb 7, better-auth 1.7, zod 4, resend 6. Node 24 (runs `.ts` natively for tests and scripts). Local Mongo via podman.

**Spec:** `docs/superpowers/specs/2026-09-17-clutch-esports-registration-design.md`

## Global Constraints

- No React Three Fiber, drei, postprocessing, state library, animation library, date library, CSV library, markdown library, Mongoose, or test framework.
- Files in `src/lib` that tests import use **relative imports with the `.ts` extension**, `import type` / inline `type` for type-only imports, no enums, no parameter properties, and never import from `next/*` or `@/`. (Node type-stripping runs them as-is.)
- Every server action validates with zod and returns `{ ok: true, ... } | { ok: false, error: string }`. Every admin action and the export route call `requireAdmin()` themselves.
- `isAdmin` requires the email to be in `ADMIN_EMAILS` **and** `emailVerified === true`.
- Room ID/password never reach a client that is not a confirmed registrant: rendered in server components only.
- Times: UTC in the database, IST (`+05:30`) in every input and label, formatted with `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })`.
- Visible copy: no em-dashes, no tracked all-caps eyebrow on every section, no arrow glyphs on links, no single accented headline word. Primary buttons are solid `--volt` with `--ink` text. Touch targets at least 44 px. Visible focus rings.
- 3D stays abstract. No weapon models, no official game logos.
- Colour tokens exactly as in spec section 6. Accent is `oklch(0.78 0.17 var(--hue))`.
- Preview and screenshots on port **3100**. Never `pkill -f "next start"`; kill by port (`ss -ltnpH 'sport = :3100'`).
- Screenshots: 1440x900 and 390x844 (mobile, DPR 2), with `prefers-reduced-motion: no-preference` emulated and `scroll-behavior` forced to `auto` before scrolling.
- Commit after every task with the project's attribution trailer.

**Note on UI tasks (6 to 10):** the user requires visual work to be authored with the design skills loaded (`design-taste-frontend`, `high-end-visual-design`, `frontend-design`; `threejs-3d-web` for Task 5). Those skills shape markup and class choices, so UI tasks below fix the files, props, data calls, states, copy and acceptance checks, and leave the JSX to be written under the skills. Everything with logic in it (lib, auth, actions, scene engine, tests) is given in full.

---

## File map

```
src/lib/db.ts              Mongo client (global-cached), db handle, ensureIndexes()
src/lib/schemas.ts         zod schemas + enums + inferred input types
src/lib/time.ts            istToUtc, utcToIstInput, formatIst
src/lib/csv.ts             toCsv with formula-injection guard
src/lib/games.ts           presets (name, glyph, hue, teamSize, id placeholder) + glyph SVG paths
src/lib/tournaments.ts     types, queries, claimSlot, cancelRegistration, saveTournament, room, recount
src/lib/auth.ts            better-auth instance, getUser()           (imports next/headers: not test-imported)
src/lib/auth-client.ts     createAuthClient
src/lib/admin.ts           isAdmin, requireAdmin
src/components/scene/*     scene-store.ts, shapes.ts, swarm.ts, SceneCanvas.tsx, SceneTarget.tsx
src/components/*           Nav, Button, Field, GameCard, GlyphIcon, SlotMeter, Countdown, AutoRefresh
src/app/layout.tsx, template.tsx, globals.css, not-found.tsx, error.tsx, loading.tsx
src/app/(site)/page.tsx, games/[slug]/page.tsx, games/[slug]/register/{page.tsx,RegisterForm.tsx,actions.ts}, me/{page.tsx,actions.ts}
src/app/(auth)/{login,signup,forgot-password,reset-password}/page.tsx + AuthForm.tsx
src/app/admin/{layout.tsx,page.tsx,actions.ts}, games/new/page.tsx, games/[id]/page.tsx, games/[id]/export/route.ts, TournamentForm.tsx
src/app/api/auth/[...all]/route.ts
scripts/seed.ts, scripts/shots.mjs
test/util.test.ts, test/claim.test.ts
```

---

### Task 1: Scaffold, dependencies, local database

**Files:** whole scaffold; `.env.example`, `.env.local`, `package.json` scripts, `tsconfig.json` flags.

**Produces:** a building Next app, Mongo on `localhost:27017`, `npm test` and `npm run seed` wired.

- [ ] **Step 1: Scaffold outside the repo** (the folder name `Clutch` has a capital, which create-next-app rejects as a package name)

```bash
cd "$SCRATCH" && npx create-next-app@latest clutch --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
rm -rf clutch/.git clutch/node_modules && cp -rT clutch /home/rushikumar/Documents/Clutch
cd /home/rushikumar/Documents/Clutch && npm install
```

- [ ] **Step 2: Dependencies**

```bash
npm i three mongodb better-auth zod resend && npm i -D @types/three
```

- [ ] **Step 3: tsconfig** add to `compilerOptions`: `"allowImportingTsExtensions": true, "erasableSyntaxOnly": true`.

- [ ] **Step 4: package.json scripts**

```json
"dev": "next dev", "build": "next build", "start": "next start", "lint": "eslint",
"test": "MONGODB_DB=clutch_test node --test --env-file=.env.local \"test/*.test.ts\"",
"seed": "node --env-file=.env.local scripts/seed.ts",
"shots": "node scripts/shots.mjs"
```

- [ ] **Step 5: Env files.** `.env.example` (committed) and `.env.local` (ignored; secret from `openssl rand -base64 32`):

```
MONGODB_URI=mongodb://127.0.0.1:27017/clutch
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=
EMAIL_FROM=Clutch <noreply@yourdomain.com>
ADMIN_EMAILS=you@example.com
```

Add `shots/` to `.gitignore`.

- [ ] **Step 6: Local Mongo**

```bash
podman run -d --name clutch-mongo -p 27017:27017 docker.io/library/mongo:8
```

Expected: `ss -ltnH 'sport = :27017'` shows a listener.

- [ ] **Step 7: Verify and commit.** `npm run build` exits 0. Commit "Scaffold Next app, deps, env, scripts".

---

### Task 2: Data layer (TDD)

**Files:** Create `src/lib/{db,schemas,time,csv,tournaments}.ts`, `test/util.test.ts`, `test/claim.test.ts`.

**Produces (exact names later tasks use):**

```ts
// db.ts
export const client: MongoClient; export const db: Db; export function ensureIndexes(): Promise<void>
// time.ts
istToUtc(local: string): Date          // '2026-09-20T20:00' -> Date
utcToIstInput(d: Date): string         // Date -> '2026-09-20T20:00'
formatIst(d: Date): string             // 'Sun, 20 Sept, 8:00 pm IST'
// csv.ts
toCsv(rows: unknown[][]): string
// schemas.ts
GAMES, GLYPHS, STATUSES, tournamentInput, registrationInput, roomInput, phoneSchema
type TournamentInput, RegistrationInput, RoomInput, Game, Glyph, Status
// tournaments.ts
type Player, Room, Tournament, Registration, SessionUser = { id: string; email: string; phone: string }
tournaments(), registrations()                       // typed collections
isRegOpen(t, now?): boolean
listOpen(): Promise<Tournament[]>; listAll(); getBySlug(slug); getById(id: string)
myRegistration(tournamentId: ObjectId, userId: string): Promise<Registration | null>
listMine(userId): Promise<{ reg: Registration; t: Tournament }[]>
listRegistrations(tournamentId: ObjectId): Promise<Registration[]>   // confirmed only, oldest first
claimSlot(tournamentId, user: SessionUser, input: RegistrationInput): Promise<ClaimResult>
cancelRegistration(registrationId: ObjectId, userId: string | null): Promise<boolean>   // null = admin, skips deadline
saveTournament(id: ObjectId | null, input: TournamentInput): Promise<{ ok: true; id: ObjectId; slug: string } | { ok: false; error: string }>
deleteTournament(id): Promise<boolean>; setStatus(id, status); setRoom(id, room: RoomInput | null); recountSlots(id)
```

- [ ] **Step 1: Write `test/util.test.ts`**

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { istToUtc, utcToIstInput, formatIst } from '../src/lib/time.ts'
import { toCsv } from '../src/lib/csv.ts'

test('IST input converts to UTC and back', () => {
  const d = istToUtc('2026-09-20T20:00')
  assert.equal(d.toISOString(), '2026-09-20T14:30:00.000Z')
  assert.equal(utcToIstInput(d), '2026-09-20T20:00')
  assert.match(formatIst(d), /8:00\s?pm IST$/i)
})

test('csv escapes quotes and defuses formulas', () => {
  assert.equal(toCsv([['a"b', '=SUM(A1)', 7, null]]), `"a""b","'=SUM(A1)","7",""`)
  assert.equal(toCsv([['x'], ['y']]), '"x"\r\n"y"')
})
```

- [ ] **Step 2: Write `test/claim.test.ts`**

```ts
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { client, db } from '../src/lib/db.ts'
import { claimSlot, cancelRegistration, saveTournament, tournaments, registrations } from '../src/lib/tournaments.ts'

const user = (i: number) => ({ id: `u${i}`, email: `u${i}@t.dev`, phone: '9999999999' })
const roster = (n: number) => ({
  teamName: n > 1 ? 'Team' : '',
  players: Array.from({ length: n }, (_, i) => ({ name: `Player ${i}`, inGameId: `id${i}` })),
})
async function make(over: Record<string, unknown> = {}) {
  const _id = new ObjectId()
  await tournaments().insertOne({
    _id, slug: _id.toHexString(), game: 'bgmi', gameName: 'BGMI', title: 'T', mode: '', glyph: 'drop', hue: 80,
    startsAt: new Date(Date.now() + 864e5), regClosesAt: new Date(Date.now() + 864e5),
    teamSize: 1, maxSlots: 3, slotsTaken: 0, rules: '', prize: '', status: 'open', room: null,
    createdAt: new Date(), updatedAt: new Date(), ...over,
  } as never)
  return _id
}
const taken = async (id: ObjectId) => (await tournaments().findOne({ _id: id }))!.slotsTaken

before(async () => { assert.match(db.databaseName, /test/); await db.dropDatabase() })
after(() => client.close())

test('10 concurrent claims on 3 slots: exactly 3 win', async () => {
  const id = await make()
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => claimSlot(id, user(i), roster(1))))
  assert.equal(results.filter(r => r.ok).length, 3)
  assert.ok(results.filter(r => !r.ok).every(r => !r.ok && r.error === 'closed_or_full'))
  assert.equal(await taken(id), 3)
  assert.equal(await registrations().countDocuments({ tournamentId: id, status: 'confirmed' }), 3)
})

test('same user twice: second fails and leaks no slot', async () => {
  const id = await make()
  assert.equal((await claimSlot(id, user(1), roster(1))).ok, true)
  const again = await claimSlot(id, user(1), roster(1))
  assert.deepEqual(again, { ok: false, error: 'already_registered' })
  assert.equal(await taken(id), 1)
})

test('cancel frees the slot and allows re-register', async () => {
  const id = await make({ maxSlots: 1 })
  await claimSlot(id, user(1), roster(1))
  const reg = (await registrations().findOne({ tournamentId: id, userId: 'u1' }))!
  assert.equal(await cancelRegistration(reg._id, 'u2'), false)      // not the owner
  assert.equal(await cancelRegistration(reg._id, 'u1'), true)
  assert.equal(await cancelRegistration(reg._id, 'u1'), false)      // already cancelled
  assert.equal(await taken(id), 0)
  assert.equal((await claimSlot(id, user(1), roster(1))).ok, true)
})

test('closed, past-deadline and wrong roster reject without taking a slot', async () => {
  const closed = await make({ status: 'closed' })
  assert.deepEqual(await claimSlot(closed, user(1), roster(1)), { ok: false, error: 'closed_or_full' })
  const late = await make({ regClosesAt: new Date(Date.now() - 1000) })
  assert.deepEqual(await claimSlot(late, user(1), roster(1)), { ok: false, error: 'closed_or_full' })
  const squad = await make({ teamSize: 4 })
  assert.deepEqual(await claimSlot(squad, user(1), roster(3)), { ok: false, error: 'invalid_roster' })
  assert.deepEqual(await claimSlot(squad, user(1), { ...roster(4), teamName: '' }), { ok: false, error: 'invalid_roster' })
  assert.equal(await taken(squad), 0)
})

test('saveTournament edit rules', async () => {
  const base = { game: 'bgmi', gameName: 'BGMI', title: 'Friday Scrims', mode: '', glyph: 'drop', hue: 80,
    startsAt: '2030-01-01T20:00', regClosesAt: '', teamSize: 1, maxSlots: 2, rules: '', prize: '', status: 'open' } as const
  const made = await saveTournament(null, base)
  assert.ok(made.ok)
  if (!made.ok) return
  assert.match(made.slug, /^friday-scrims-[a-z0-9]{4}$/)
  await claimSlot(made.id, user(1), roster(1)); await claimSlot(made.id, user(2), roster(1))
  assert.equal((await saveTournament(made.id, { ...base, maxSlots: 1 })).ok, false)   // below taken
  assert.equal((await saveTournament(made.id, { ...base, teamSize: 4 })).ok, false)   // roster locked
  assert.equal((await saveTournament(made.id, { ...base, maxSlots: 5 })).ok, true)
})
```

- [ ] **Step 3: Run, expect failure.** `npm test` fails with `ERR_MODULE_NOT_FOUND` for `src/lib/time.ts`.

- [ ] **Step 4: `src/lib/time.ts` and `src/lib/csv.ts`**

```ts
// time.ts  (India has no DST, so IST is a fixed +05:30)
export const istToUtc = (local: string) => new Date(`${local}:00+05:30`)
export const utcToIstInput = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16)
const fmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
})
export const formatIst = (d: Date) => `${fmt.format(d)} IST`
```

```ts
// csv.ts
const cell = (v: unknown) => {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // spreadsheet formula injection guard
  return `"${s.replace(/"/g, '""')}"`
}
export const toCsv = (rows: unknown[][]) => rows.map(r => r.map(cell).join(',')).join('\r\n')
```

- [ ] **Step 5: `src/lib/db.ts`**

```ts
import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('Missing env var MONGODB_URI')

// cached on globalThis so dev HMR and warm Vercel lambdas reuse one pool
const g = globalThis as unknown as { _mongo?: MongoClient; _indexes?: Promise<void> }
export const client = (g._mongo ??= new MongoClient(uri))
export const db: Db = client.db(process.env.MONGODB_DB)

export const ensureIndexes = () =>
  (g._indexes ??= Promise.all([
    db.collection('tournaments').createIndex({ slug: 1 }, { unique: true }),
    db.collection('registrations').createIndex(
      { tournamentId: 1, userId: 1 },
      { unique: true, partialFilterExpression: { status: 'confirmed' } },
    ),
    db.collection('registrations').createIndex({ tournamentId: 1, createdAt: 1 }),
  ]).then(() => undefined))
```

- [ ] **Step 6: `src/lib/schemas.ts`**

```ts
import { z } from 'zod'

export const GAMES = ['bgmi', 'freefire', 'valorant', 'codm', 'custom'] as const
export const GLYPHS = ['drop', 'flame', 'spike', 'rank', 'crest'] as const
export const STATUSES = ['draft', 'open', 'closed', 'completed'] as const
export type Game = (typeof GAMES)[number]
export type Glyph = (typeof GLYPHS)[number]
export type Status = (typeof STATUSES)[number]

const text = (max: number) => z.string().trim().max(max)
const istLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Pick a date and time')

export const tournamentInput = z.object({
  game: z.enum(GAMES),
  gameName: text(40).min(1, 'Game name is required'),
  title: text(80).min(3, 'Title is too short'),
  mode: text(80),
  glyph: z.enum(GLYPHS),
  hue: z.coerce.number().int().min(0).max(360),
  startsAt: istLocal,
  regClosesAt: istLocal.or(z.literal('')),
  teamSize: z.coerce.number().int().min(1).max(10),
  maxSlots: z.coerce.number().int().min(1).max(1000),
  rules: text(5000),
  prize: text(120),
  status: z.enum(STATUSES),
})
export type TournamentInput = z.infer<typeof tournamentInput>

export const registrationInput = z.object({
  teamName: text(40),
  players: z.array(z.object({
    name: text(40).min(2, 'Player name is too short'),
    inGameId: text(40).min(2, 'In-game ID is too short'),
  })).min(1).max(10),
})
export type RegistrationInput = z.infer<typeof registrationInput>

export const roomInput = z.object({ id: text(40).min(1, 'Room ID is required'), password: text(40), note: text(200) })
export type RoomInput = z.infer<typeof roomInput>

// collected, never verified (no OTP): shape check only
export const phoneSchema = z.string()
  .transform(s => s.replace(/[\s+\-()]/g, ''))
  .pipe(z.string().regex(/^\d{10,13}$/, 'Enter a valid phone number'))
```

- [ ] **Step 7: `src/lib/tournaments.ts`**

```ts
import { ObjectId } from 'mongodb'
import { randomInt } from 'node:crypto'
import { db, ensureIndexes } from './db.ts'
import { istToUtc } from './time.ts'
import type { Game, Glyph, Status, TournamentInput, RegistrationInput, RoomInput } from './schemas.ts'

export type Player = { name: string; inGameId: string }
export type Room = { id: string; password: string; note: string; publishedAt: Date }
export type Tournament = {
  _id: ObjectId; slug: string; game: Game; gameName: string; title: string; mode: string; glyph: Glyph; hue: number
  startsAt: Date; regClosesAt: Date; teamSize: number; maxSlots: number; slotsTaken: number
  rules: string; prize: string; status: Status; room: Room | null; createdAt: Date; updatedAt: Date
}
export type Registration = {
  _id: ObjectId; tournamentId: ObjectId; userId: string; code: string; teamName: string | null
  players: Player[]; phone: string; email: string; status: 'confirmed' | 'cancelled'; createdAt: Date
}
export type SessionUser = { id: string; email: string; phone: string }
export type ClaimError = 'not_found' | 'invalid_roster' | 'closed_or_full' | 'already_registered'
export type ClaimResult = { ok: true; code: string } | { ok: false; error: ClaimError }

export const tournaments = () => db.collection<Tournament>('tournaments')
export const registrations = () => db.collection<Registration>('registrations')

export const isRegOpen = (t: Tournament, now = new Date()) =>
  t.status === 'open' && now < t.regClosesAt && t.slotsTaken < t.maxSlots

export const listOpen = () =>
  tournaments().find({ status: 'open', startsAt: { $gt: new Date() } }).sort({ startsAt: 1 }).toArray()
export const listAll = () => tournaments().find().sort({ startsAt: -1 }).toArray()
export const getBySlug = (slug: string) => tournaments().findOne({ slug })
export const getById = (id: string) => (ObjectId.isValid(id) ? tournaments().findOne({ _id: new ObjectId(id) }) : null)
export const myRegistration = (tournamentId: ObjectId, userId: string) =>
  registrations().findOne({ tournamentId, userId, status: 'confirmed' })
export const listRegistrations = (tournamentId: ObjectId) =>
  registrations().find({ tournamentId, status: 'confirmed' }).sort({ createdAt: 1 }).toArray()

export async function listMine(userId: string) {
  const regs = await registrations().find({ userId, status: 'confirmed' }).sort({ createdAt: -1 }).toArray()
  const ts = await tournaments().find({ _id: { $in: regs.map(r => r.tournamentId) } }).toArray()
  const byId = new Map(ts.map(t => [t._id.toHexString(), t]))
  return regs.flatMap(reg => {
    const t = byId.get(reg.tournamentId.toHexString())
    return t ? [{ reg, t }] : []
  })
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
const newCode = () => 'CL-' + Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('')

export async function claimSlot(tournamentId: ObjectId, user: SessionUser, input: RegistrationInput): Promise<ClaimResult> {
  await ensureIndexes() // the unique index is what makes "already registered" race-safe
  const t = await tournaments().findOne({ _id: tournamentId })
  if (!t) return { ok: false, error: 'not_found' }
  if (input.players.length !== t.teamSize || (t.teamSize > 1 && !input.teamName)) return { ok: false, error: 'invalid_roster' }

  const now = new Date()
  const claimed = await tournaments().findOneAndUpdate(
    { _id: tournamentId, status: 'open', regClosesAt: { $gt: now }, $expr: { $lt: ['$slotsTaken', '$maxSlots'] } },
    { $inc: { slotsTaken: 1 } },
  )
  if (!claimed) return { ok: false, error: 'closed_or_full' }

  const code = newCode()
  try {
    await registrations().insertOne({
      _id: new ObjectId(), tournamentId, userId: user.id, code,
      teamName: t.teamSize > 1 ? input.teamName : null, players: input.players,
      phone: user.phone, email: user.email, status: 'confirmed', createdAt: now,
    })
    return { ok: true, code }
  } catch (e) {
    // ponytail: no transaction. A crash between the $inc above and this release leaks one slot;
    // the admin "Recount slots" button repairs it. Use a transaction if that ever bites.
    await tournaments().updateOne({ _id: tournamentId }, { $inc: { slotsTaken: -1 } })
    if ((e as { code?: number }).code === 11000) return { ok: false, error: 'already_registered' }
    throw e
  }
}

/** userId = the owner cancelling (deadline enforced); null = admin removal (no deadline). */
export async function cancelRegistration(registrationId: ObjectId, userId: string | null) {
  const filter = { _id: registrationId, status: 'confirmed' as const, ...(userId ? { userId } : {}) }
  if (userId) {
    const reg = await registrations().findOne(filter)
    const t = reg && (await tournaments().findOne({ _id: reg.tournamentId }))
    if (!t || new Date() >= t.regClosesAt) return false
  }
  const flipped = await registrations().findOneAndUpdate(filter, { $set: { status: 'cancelled' } })
  if (!flipped) return false
  await tournaments().updateOne({ _id: flipped.tournamentId }, { $inc: { slotsTaken: -1 } })
  return true
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'game'
const suffix = () => Array.from({ length: 4 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[randomInt(31)]).join('')

export async function saveTournament(id: ObjectId | null, input: TournamentInput) {
  await ensureIndexes()
  const { startsAt, regClosesAt, ...rest } = input
  const starts = istToUtc(startsAt)
  const closes = regClosesAt ? istToUtc(regClosesAt) : starts
  if (closes > starts) return { ok: false as const, error: 'Registration must close before the game starts' }
  const fields = { ...rest, startsAt: starts, regClosesAt: closes, updatedAt: new Date() }

  if (!id) {
    const _id = new ObjectId()
    const slug = `${slugify(input.title)}-${suffix()}`
    await tournaments().insertOne({ _id, slug, ...fields, slotsTaken: 0, room: null, createdAt: new Date() })
    return { ok: true as const, id: _id, slug }
  }
  // both edit rules are enforced in the filter so they hold under concurrent registrations
  const updated = await tournaments().findOneAndUpdate(
    { _id: id, slotsTaken: { $lte: input.maxSlots }, $or: [{ teamSize: input.teamSize }, { slotsTaken: 0 }] },
    { $set: fields },
    { returnDocument: 'after' },
  )
  if (!updated) return { ok: false as const, error: 'Slots cannot go below registrations already taken, and team size is locked once anyone has registered' }
  return { ok: true as const, id, slug: updated.slug }
}

export async function deleteTournament(id: ObjectId) {
  const { deletedCount } = await tournaments().deleteOne({ _id: id, slotsTaken: 0 })
  if (deletedCount) await registrations().deleteMany({ tournamentId: id })
  return deletedCount === 1
}
export const setStatus = (id: ObjectId, status: Status) =>
  tournaments().updateOne({ _id: id }, { $set: { status, updatedAt: new Date() } })
export const setRoom = (id: ObjectId, room: RoomInput | null) =>
  tournaments().updateOne({ _id: id }, { $set: { room: room && { ...room, publishedAt: new Date() }, updatedAt: new Date() } })
export async function recountSlots(id: ObjectId) {
  // ponytail: racy against a claim that is between its $inc and its insert; admin-triggered only, never automatic
  const n = await registrations().countDocuments({ tournamentId: id, status: 'confirmed' })
  await tournaments().updateOne({ _id: id }, { $set: { slotsTaken: n } })
}
```

- [ ] **Step 8: Run, expect pass.** `npm test`: 7 tests pass, 0 fail.
- [ ] **Step 9: Commit** "Data layer: atomic slot claim, cancel, tournament edit rules, time and csv helpers".

---

### Task 3: Accounts and admin guard

**Files:** Create `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/admin.ts`, `src/app/api/auth/[...all]/route.ts`.

**Consumes:** `db` from `db.ts`, `phoneSchema`.
**Produces:** `auth`, `getUser(): Promise<(User & { phone: string }) | null>`, `authClient`, `isAdmin(user)`, `requireAdmin()`.

Before writing, confirm option names against the installed types (`node_modules/better-auth/dist/**/*.d.ts`) and https://www.better-auth.com/docs: `emailAndPassword.sendResetPassword`, `emailVerification.sendVerificationEmail`, `user.additionalFields`, `databaseHooks.user.create.before`, `nextCookies`, `toNextJsHandler`, client `requestPasswordReset` / `resetPassword` / `sendVerificationEmail`. Adjust names if 1.7 differs; the behaviour below is the contract.

- [ ] **Step 1: `src/lib/auth.ts`**

```ts
import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { nextCookies } from 'better-auth/next-js'
import { APIError } from 'better-auth/api'
import { headers } from 'next/headers'
import { Resend } from 'resend'
import { db } from './db.ts'
import { phoneSchema } from './schemas.ts'

async function sendMail(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === 'production') throw new Error('Missing env var RESEND_API_KEY')
    console.log(`[dev mail] to ${to}: ${subject}\n${text}`)
    return
  }
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.EMAIL_FROM!, to, subject, text })
  if (error) throw new Error(`Resend: ${error.message}`)
}

export const auth = betterAuth({
  // no `client` option: transactions off, so standalone local Mongo works
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: ({ user, url }) =>
      sendMail(user.email, 'Reset your Clutch password', `Reset your password with this link. It expires in 1 hour.\n\n${url}`),
  },
  emailVerification: {
    sendOnSignUp: true, // players may ignore it; only admin access requires a verified email
    autoSignInAfterVerification: true,
    sendVerificationEmail: ({ user, url }) =>
      sendMail(user.email, 'Verify your Clutch email', `Confirm this is your email address:\n\n${url}`),
  },
  user: { additionalFields: { phone: { type: 'string', required: true } } },
  databaseHooks: {
    user: {
      create: {
        before: async user => {
          const phone = phoneSchema.safeParse((user as { phone?: unknown }).phone)
          if (!phone.success) throw new APIError('BAD_REQUEST', { message: 'Enter a valid phone number' })
          return { data: { ...user, phone: phone.data } }
        },
      },
    },
  },
  plugins: [nextCookies()], // keep last
})

export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}
```

- [ ] **Step 2: `src/lib/auth-client.ts`**

```ts
import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from './auth.ts'

export const authClient = createAuthClient({ plugins: [inferAdditionalFields<typeof auth>()] })
```

- [ ] **Step 3: `src/lib/admin.ts`**

```ts
import { notFound } from 'next/navigation'
import { getUser } from './auth.ts'

const listed = (email: string) =>
  (process.env.ADMIN_EMAILS ?? '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean).includes(email.toLowerCase())

/** Listed AND verified: without verification anyone could sign up with the owner's address first. */
export const isAdmin = (u: { email: string; emailVerified: boolean } | null) => !!u && u.emailVerified && listed(u.email)
export const isUnverifiedAdmin = (u: { email: string; emailVerified: boolean } | null) => !!u && !u.emailVerified && listed(u.email)

export async function requireAdmin() {
  const user = await getUser()
  if (!isAdmin(user)) notFound() // 404, not 403: do not reveal that /admin exists
  return user!
}
```

- [ ] **Step 4: route handler** `src/app/api/auth/[...all]/route.ts`

```ts
import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth'

export const { GET, POST } = toNextJsHandler(auth)
```

- [ ] **Step 5: Verify against a running server** (`npm run dev -- -p 3100` in the background)

```bash
curl -si localhost:3100/api/auth/sign-up/email -H 'content-type: application/json' -H 'origin: http://localhost:3100' \
  -d '{"name":"Test","email":"t1@example.com","password":"password123","phone":"+91 98765 43210"}' | head -20
```

Expected: `200` with a `set-cookie`; the dev log prints a verification link; `mongosh`-free check via
`node --env-file=.env.local -e "import('./src/lib/db.ts').then(async m=>{console.log(await m.db.collection('user').findOne({email:'t1@example.com'}));await m.client.close()})"` shows `phone: '919876543210'`. A second request with `"phone":"abc"` returns 400 "Enter a valid phone number". Set `BETTER_AUTH_URL=http://localhost:3100` while previewing on 3100.

- [ ] **Step 6: Commit** "Accounts: better-auth on Mongo, reset and verification mail, verified-admin guard".

---

### Task 4: Game presets, glyph paths, seed

**Files:** Create `src/lib/games.ts`, `scripts/seed.ts`.

**Produces:**

```ts
export const PRESETS: Record<Game, { gameName: string; glyph: Glyph; hue: number; teamSize: number; idHint: string }>
export const GLYPH_PATHS: Record<Glyph | 'check', { d: string; stroke?: number }>   // 100x100 viewBox, fill-rule evenodd
```

- [ ] **Step 1: `src/lib/games.ts`**

```ts
import type { Game, Glyph } from './schemas.ts'

export const PRESETS: Record<Game, { gameName: string; glyph: Glyph; hue: number; teamSize: number; idHint: string }> = {
  bgmi:     { gameName: 'BGMI',          glyph: 'drop',  hue: 80,  teamSize: 4, idHint: 'Character ID, e.g. 5123456789' },
  freefire: { gameName: 'Free Fire MAX', glyph: 'flame', hue: 45,  teamSize: 4, idHint: 'Player UID, e.g. 1234567890' },
  valorant: { gameName: 'Valorant',      glyph: 'spike', hue: 15,  teamSize: 5, idHint: 'Riot ID, e.g. Name#TAG' },
  codm:     { gameName: 'COD Mobile',    glyph: 'rank',  hue: 210, teamSize: 5, idHint: 'Player UID' },
  custom:   { gameName: '',              glyph: 'crest', hue: 300, teamSize: 1, idHint: 'In-game ID' },
}

// Abstract marks, not game logos. One source for the DOM icon and the particle shape.
export const GLYPH_PATHS: Record<Glyph | 'check', { d: string; stroke?: number }> = {
  drop:  { d: 'M50 6C30 6 16 21 16 40c0 24 34 54 34 54s34-30 34-54C84 21 70 6 50 6Zm0 20a14 14 0 1 1 0 28 14 14 0 0 1 0-28Z' },
  flame: { d: 'M52 4c4 18-6 26-14 36-7 9-14 18-14 30a26 26 0 0 0 52 0c0-10-4-17-9-24-2 6-5 10-10 12 3-18-1-38-5-54ZM50 62c-6 7-10 12-10 19a10 10 0 0 0 20 0c0-7-4-12-10-19Z' },
  spike: { d: 'M8 30h20l22 40 22-40h20L50 96ZM50 4l11 15-11 15-11-15Z' },
  rank:  { d: 'M14 18l36 22 36-22v16L50 56 14 34ZM14 46l36 22 36-22v16L50 84 14 62Z' },
  crest: { d: 'M50 6l38 22v44L50 94 12 72V28ZM50 26 30 38v24l20 12 20-12V38Z' },
  check: { d: 'M20 54l20 20 42-46', stroke: 12 },
}
```

Paths are first drafts: look at each as a 96 px DOM icon in Task 6 and as particles in Task 5, and redraw any that read badly.

- [ ] **Step 2: `scripts/seed.ts`** inserts four open tournaments (skips if any exist unless `--reset`, which drops `tournaments` and `registrations`):

```ts
import { client } from '../src/lib/db.ts'
import { saveTournament, tournaments, registrations } from '../src/lib/tournaments.ts'
import { PRESETS } from '../src/lib/games.ts'
import { utcToIstInput } from '../src/lib/time.ts'

if (process.argv.includes('--reset')) { await tournaments().deleteMany({}); await registrations().deleteMany({}) }
if (await tournaments().countDocuments()) { console.log('tournaments exist, skipping (use --reset)'); await client.close(); process.exit(0) }

const at = (days: number, hourIst: number) => {
  const d = new Date(Date.now() + days * 864e5)
  return `${utcToIstInput(d).slice(0, 10)}T${String(hourIst).padStart(2, '0')}:00`
}
const RULES = 'Join the room 15 minutes before start.\nNo emulators, no hacks, no teaming.\nScreenshots of results may be requested.\nAdmin decisions are final.'
const seeds = [
  { game: 'bgmi',     title: 'Friday Night Scrims',  mode: 'Squad TPP, Erangel',      days: 2, hour: 21, maxSlots: 25, prize: 'Bragging rights' },
  { game: 'freefire', title: 'Booyah Cup',           mode: 'Squad, Bermuda',          days: 3, hour: 20, maxSlots: 12, prize: '' },
  { game: 'valorant', title: 'Spike Rush Showdown',  mode: '5v5, single elimination', days: 5, hour: 19, maxSlots: 16, prize: '' },
  { game: 'codm',     title: 'Sunday Solo Royale',   mode: 'Solo BR, Isolated',       days: 7, hour: 18, maxSlots: 50, prize: '', teamSize: 1 },
] as const
for (const s of seeds) {
  const p = PRESETS[s.game]
  const r = await saveTournament(null, {
    game: s.game, gameName: p.gameName, title: s.title, mode: s.mode, glyph: p.glyph, hue: p.hue,
    startsAt: at(s.days, s.hour), regClosesAt: '', teamSize: 'teamSize' in s ? s.teamSize : p.teamSize,
    maxSlots: s.maxSlots, rules: RULES, prize: s.prize, status: 'open',
  })
  console.log(r.ok ? `seeded ${r.slug}` : r.error)
}
await client.close()
```

- [ ] **Step 3: Verify.** `npm run seed` prints four `seeded ...` lines; running it again prints the skip line.
- [ ] **Step 4: Commit** "Game presets, glyph paths, seed script".

---

### Task 5: The swarm (three.js scene engine)

Load the `threejs-3d-web` skill first.

**Files:** Create `src/components/scene/{scene-store.ts,shapes.ts,swarm.ts,SceneCanvas.tsx,SceneTarget.tsx}`, `scripts/shots.mjs`, temporary `src/app/scene-lab/page.tsx` (deleted at the end of the task).

**Produces:**

```ts
// scene-store.ts
export type Shape = 'trophy' | 'field' | 'slots' | 'check' | Glyph
export type Target = { shape: Shape; hue: number | null; slots?: { taken: number; max: number }; burst?: boolean }
export function setBase(t: Target): void          // the page's resting target
export function setOverride(t: Target | null, owner: object): void   // hover / in-view; clearing only works for the current owner
export function getTarget(): Target                // override ?? base
export function subscribe(fn: (t: Target) => void): () => void
// SceneTarget.tsx
<SceneTarget shape hue slots? burst? />            // sets base on mount / prop change
<SceneZone shape hue slots? className?>children</SceneZone>   // override while >= 50% in view
export function useSceneHover(target: Target): { onPointerEnter, onPointerLeave, onFocus, onBlur }
```

- [ ] **Step 1: `scene-store.ts`**

```ts
import type { Glyph } from '@/lib/schemas'

export type Shape = 'trophy' | 'field' | 'slots' | 'check' | Glyph
export type Target = { shape: Shape; hue: number | null; slots?: { taken: number; max: number }; burst?: boolean }

let base: Target = { shape: 'field', hue: null }
let override: { t: Target; owner: object } | null = null
const subs = new Set<(t: Target) => void>()
const emit = () => subs.forEach(f => f(getTarget()))

export const getTarget = () => override?.t ?? base
export const setBase = (t: Target) => { base = t; override = null; emit() }
export const setOverride = (t: Target | null, owner: object) => {
  if (t) override = { t, owner }
  else if (override?.owner === owner) override = null
  else return
  emit()
}
export const subscribe = (f: (t: Target) => void) => { subs.add(f); return () => { subs.delete(f) } }
```

- [ ] **Step 2: `shapes.ts`** Every generator returns `Float32Array(count * 3)` in a roughly `[-1.6, 1.6]` box, with points in **random order** (so a draw-range prefix is a uniform subsample).

  - `trophy(count)`: parametric lathe. Profile control points `[y, r]`: base `[-1.5,.75] [-1.35,.75] [-1.3,.3]`, stem `[-.6,.14]`, knot `[-.45,.3] [-.3,.14]`, bowl `[-.1,.35] [.4,.95] [1.3,1.15]`, rim `[1.38,1.05]`. Pick a segment with probability proportional to `length * meanRadius`, lerp along it, random angle. 14% of points go to two handles: half-torus arcs centred at `(±1.2, .75)`, major radius .45, tube jitter .05. 6% fill the rim disc sparsely.
  - `fromPath({ d, stroke }, count, depth = 0.22)`: 256 px offscreen canvas, scale 2.56, `ctx.fill(new Path2D(d), 'evenodd')` or `ctx.stroke` with `lineWidth = stroke`, round caps and joins; collect opaque pixels from `getImageData`; sample `count` of them with sub-pixel jitter; map to x,y in `[-1.5, 1.5]` (y flipped); `z = (rand - .5) * depth`.
  - `slots(taken, max, count)`: ring radius 1.35. `max <= 64`: each point picks a slot with weight 5 if taken, 1 if free; taken slots are Gaussian blobs (sigma `min(.13, 2.2 / max)`); free slots are hollow circles of that radius. `max > 64`: arc gauge starting at 12 o'clock going clockwise; the taken fraction gets 80% of points with radial jitter .09, the rest gets 20% with jitter .02.
  - `field(count)`: uniform in an ellipsoid 3.2 x 1.9 x 1.2.
  - `shapeFor(target, count)`: dispatch; cache by key (`slots` keyed by `taken/max`).

- [ ] **Step 3: `swarm.ts`** `export function createSwarm(canvas: HTMLCanvasElement): { dispose(): void }`

  Setup: `WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' })` inside try/catch (on failure hide the canvas and return a no-op dispose). `coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 800`; `COUNT = coarse ? 12000 : 40000`; pixel ratio `min(devicePixelRatio, coarse ? 1.5 : 2)`. `PerspectiveCamera(50)` at `z = 6`. One `BufferGeometry` with `position` (unused placeholder, needed for bounding), `aFrom`, `aTo`, `aSeed`; `frustumCulled = false`. `ShaderMaterial` with `transparent`, `depthWrite: false`, `blending: AdditiveBlending`.

  Vertex shader:

```glsl
attribute vec3 aFrom; attribute vec3 aTo; attribute float aSeed;
uniform float uProgress, uTime, uSize, uMotion, uRot, uBurst;
uniform vec2 uPointer; uniform vec2 uAnchor; uniform float uScale;
varying float vAlpha;
void main() {
  float p = clamp((uProgress - aSeed * 0.35) / 0.65, 0.0, 1.0);
  p = p * p * (3.0 - 2.0 * p);
  vec3 pos = mix(aFrom, aTo, p);
  float arc = sin(p * 3.14159);
  vec3 n = vec3(sin(aSeed * 91.7 + uTime * 0.7), cos(aSeed * 53.3 + uTime * 0.9), sin(aSeed * 27.1 - uTime * 0.5));
  pos += n * (0.9 * arc + 0.02) * uMotion;                 // flight scatter + idle shimmer
  pos += normalize(pos + n * 0.01) * uBurst * (0.6 + aSeed) * 2.2;   // radial burst
  float c = cos(uRot), s = sin(uRot);
  pos = vec3(c * pos.x + s * pos.z, pos.y, -s * pos.x + c * pos.z);
  pos = pos * uScale + vec3(uAnchor, 0.0);
  vec2 d = pos.xy - uPointer;                               // pointer push, in world space after rotation
  pos.xy += normalize(d + 1e-5) * 0.4 * uMotion * smoothstep(0.9, 0.0, length(d));
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = uSize * (0.6 + aSeed * 0.8) / -mv.z;
  gl_Position = projectionMatrix * mv;
  vAlpha = 0.5 + 0.5 * aSeed;
}
```

  Fragment shader:

```glsl
uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(uColor, a * a * vAlpha * uOpacity);
}
```

  Behaviour:
  - **Retarget** (store subscription): bake current positions into `aFrom` on the CPU with the same staggered smoothstep (`from + (to - from) * p_i`), copy the new shape into `aTo`, set `uProgress = 0`, mark both attributes `needsUpdate`. If `target.burst`, run `uBurst` 0 to 1 to 0 over 0.9 s before the morph starts.
  - **Frame:** `uProgress` advances over 1.6 s; colour lerps toward `oklchToLinearSrgb(hue === null ? [0.93, 0.22, 125] : [0.78, 0.17, hue])` (standard OKLab matrices, ~15 lines, clamp to 0..1); `uOpacity` eases to `field: 0.22`, others `0.85`, then multiplied by `1 - 0.7 * clamp(scrollY / 700)` on coarse devices; rotation: trophy `rot += dt * 0.35`, otherwise ease toward `round(rot / TAU) * TAU + sin(t * 0.5) * 0.3`; anchor: `field` and `check` centre, others `(1.7, 0)` when `innerWidth >= 900` else `(0, 1.15)` with `uScale` 0.62; camera `y = -scrollY * 0.0009`.
  - **Pointer:** `pointermove` on `window` (covers touch) to NDC, unprojected to the `z = 0` plane, eased; parked at `(99, 99)` on `pointerleave` / `pointerup` for touch.
  - **Budget:** average frame time over frames 30 to 120; if over 24 ms, `geometry.setDrawRange(0, COUNT / 2)` and pixel ratio 1.
  - **Pause:** stop the RAF loop on `visibilitychange` hidden, restart on visible.
  - **Reduced motion** (`matchMedia('(prefers-reduced-motion: reduce)')`, live): `uMotion = 0`, `uProgress = 1` immediately, no rotation, no burst, no RAF loop; render once per retarget, resize and scroll end.
  - `dispose()`: cancel RAF, remove every listener, unsubscribe, dispose geometry, material and renderer.

- [ ] **Step 4: `SceneCanvas.tsx`**

```tsx
'use client'
import { useEffect, useRef } from 'react'

export default function SceneCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let dispose = () => {}
    let gone = false
    import('./swarm').then(m => { if (!gone) dispose = m.createSwarm(ref.current!).dispose })
    return () => { gone = true; dispose() }
  }, [])
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
}
```

- [ ] **Step 5: `SceneTarget.tsx`** client file exporting `SceneTarget` (effect calls `setBase`; deps are the primitive props), `SceneZone` (IntersectionObserver `threshold: 0.5`; owner is a `useRef({})` object; clears on unmount), `useSceneHover` (pointer-fine devices only: `matchMedia('(hover: hover)')`).

- [ ] **Step 6: `scripts/shots.mjs`** Headless Chrome over CDP with Node's built-in `WebSocket`: spawn `/usr/bin/google-chrome --headless=new --remote-debugging-port=0 --user-data-dir=<tmp> --hide-scrollbars`, read the `ws://` URL from stderr, `Target.createTarget`, `Target.attachToTarget { flatten: true }`, then per URL and per viewport: `Emulation.setDeviceMetricsOverride`, `Emulation.setEmulatedMedia { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] }`, `Page.navigate`, wait for `Page.loadEventFired` plus 2.5 s, optional `Runtime.evaluate` script passed with `--eval`, `Page.captureScreenshot`, write to `shots/<name>-<desktop|phone>.png`. Usage: `node scripts/shots.mjs /=home /scene-lab=lab`. Supports `--cookie name=value` (via `Network.setCookie`) for logged-in pages.

- [ ] **Step 7: Scene lab + look at it.** `src/app/scene-lab/page.tsx`: buttons for every shape and hue, calling `setBase`. Mount `<SceneCanvas />` in the root layout now. Capture each shape at both widths (`--eval` clicks the button), open the PNGs, and tune point size, opacity, counts and glyph paths until: the trophy reads as a trophy, every glyph is recognisable, the ring shows taken versus free clearly at 3/12, 14/25 and 40/100, nothing blows out to white, and phone framing keeps the shape clear of where the headline will sit.

- [ ] **Step 8: Delete `src/app/scene-lab`, `npm run build`, commit** "Swarm: morphing particle scene, store, zones, screenshot script".

---

### Task 6: Design system and shell

Load `design-taste-frontend`, `high-end-visual-design`, `frontend-design`. Follow them within the Global Constraints.

**Files:** `src/app/{globals.css,layout.tsx,template.tsx,not-found.tsx,error.tsx,loading.tsx}`, `src/components/{Nav.tsx,SignOutButton.tsx,Button.tsx,Field.tsx,GlyphIcon.tsx}`.

**Consumes:** `getUser`, `isAdmin`, `authClient.signOut`, `GLYPH_PATHS`, `SceneCanvas`.
**Produces:** `<Button variant="primary|secondary|ghost|danger" href? />` (renders `<Link>` when `href` is set), `<Field label name error? hint? ...inputProps />`, `<GlyphIcon glyph size />`, CSS tokens and utility classes, `.hue` scoping (`style={{ '--hue': t.hue }}` on a wrapper re-derives `--accent`).

- [ ] `globals.css`: tokens from spec section 6 as custom properties, Tailwind 4 `@theme inline` mapping (`--color-ink`, `--color-surface`, `--color-line`, `--color-text`, `--color-muted`, `--color-volt`, `--color-danger`, `--color-accent`), body background = `--ink` plus a soft static radial gradient (the WebGL-off fallback), `scroll-behavior: smooth` only under `prefers-reduced-motion: no-preference`, `:focus-visible` ring in `--volt`, `@keyframes page-in` (opacity + 12 px rise, 350 ms) disabled under reduced motion.
- [ ] `layout.tsx`: `next/font/google` Archivo (variable, with `axes: ['wdth']`), Geist, Geist Mono; metadata (title template `%s | Clutch`, description); `<SceneCanvas />`, `<Nav />`, `{children}`, footer. `template.tsx`: `<div className="page-in">{children}</div>`.
- [ ] `Nav.tsx` (server): wordmark, Games; logged out: Log in, Sign up (primary); logged in: My games, Admin (only when `isAdmin`), Sign out. Mobile: fits in one row at 390 px without a hamburger (wordmark + two or three items).
- [ ] `not-found`, `error` (client, with reset button), `loading` (skeleton, no spinner).
- [ ] **Verify:** screenshots of `/` (still the scaffold body is fine) and `/nope` at both widths: fonts loaded, nav fits at 390 px, focus ring visible when tabbing (`--eval` a `focus()`), contrast of `--muted` on `--ink` at least 4.5:1.
- [ ] **Commit** "Design system: Voltage tokens, type, shell, primitives".

---

### Task 7: Home page

**Files:** `src/app/(site)/page.tsx`, `src/components/{GameCard.tsx,SlotMeter.tsx,Countdown.tsx,AutoRefresh.tsx,GameList.tsx}`.

**Consumes:** `listOpen`, `isRegOpen`, `formatIst`, `useSceneHover`, `SceneTarget`, `setOverride`.

- [ ] `page.tsx`: `export const dynamic = 'force-dynamic'`. `<SceneTarget shape="trophy" hue={null} />`. Hero: headline, one-line pitch (free entry, real slots, room details on the site), primary button scrolling to `#games`. Then "Open for registration" with the cards, then a three-step "how it works" (create account, pick a game and enter your roster, get the room ID here before the match). Empty state when no games: plain message, no dead buttons.
- [ ] `GameCard` (client, receives a **plain serialisable** object: strings, numbers, ISO dates; never a Mongo document): wrapper sets `--hue`; glyph icon, game name, title, mode, date + time IST, team size label (`Solo`, `Duo`, `Squad of 4`, `Team of N`), `Free` tag, `SlotMeter`, and at the bottom two actions: **Register** (primary, `href=/games/[slug]/register`; disabled and labelled `Full` when full) and **Details** (secondary). Tilt on hover-capable devices (pointer position to `rotateX/rotateY`, max 6 degrees, reset on leave, off under reduced motion), press-scale on touch. `useSceneHover({ shape: glyph, hue })`.
- [ ] `GameList` (client): on coarse-pointer devices an IntersectionObserver (`rootMargin: '-45% 0px -45% 0px'`) sets the override to the card crossing the viewport centre and clears it when none is.
- [ ] `SlotMeter`: bar in `--accent`, mono text `14 / 25 taken`, `11 left`; `role="meter"` with `aria-valuenow/min/max`. `Countdown`: mounts empty, then ticks each second (`dd hh mm ss`, mono), shows `Live now` after start. `AutoRefresh seconds={20}`: `router.refresh()` while `document.visibilityState === 'visible'`.
- [ ] **Verify:** seed, screenshot `/` at both widths plus a scrolled phone shot and a desktop shot with a card hovered (`--eval` dispatching `pointerenter`). Check: headline never overlaps a bright part of the swarm, card rows align with actions pinned to the bottom, all text passes contrast over the particles, 390 px has no horizontal scroll.
- [ ] **Commit** "Home: hero, game cards, live slots".

---

### Task 8: Game page and registration

**Files:** `src/app/(site)/games/[slug]/page.tsx`, `.../register/{page.tsx,RegisterForm.tsx,actions.ts}`.

**Consumes:** `getBySlug`, `myRegistration`, `isRegOpen`, `claimSlot`, `registrationInput`, `getUser`, `PRESETS`, `SceneZone`, `SceneTarget`.

- [ ] `actions.ts`

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/auth'
import { registrationInput } from '@/lib/schemas'
import { claimSlot, getBySlug, type ClaimError } from '@/lib/tournaments'

export type RegisterState = { ok: true; code: string } | { ok: false; error: string } | null
const MESSAGES: Record<ClaimError, string> = {
  not_found: 'This game no longer exists.',
  invalid_roster: 'Fill in every player and the team name.',
  closed_or_full: 'Registration just closed or the last slot was taken.',
  already_registered: 'You are already registered for this game.',
}

export async function registerAction(slug: string, _prev: RegisterState, form: FormData): Promise<RegisterState> {
  const user = await getUser()
  if (!user) return { ok: false, error: 'Log in to register.' }
  const names = form.getAll('playerName'), ids = form.getAll('playerId')
  const parsed = registrationInput.safeParse({
    teamName: form.get('teamName') ?? '',
    players: names.map((name, i) => ({ name, inGameId: ids[i] })),
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const t = await getBySlug(slug)
  if (!t) return { ok: false, error: MESSAGES.not_found }
  const res = await claimSlot(t._id, { id: user.id, email: user.email, phone: user.phone }, parsed.data)
  if (!res.ok) return { ok: false, error: MESSAGES[res.error] }
  revalidatePath('/'); revalidatePath(`/games/${slug}`); revalidatePath('/me')
  return res
}
```

- [ ] Game `page.tsx`: `params` is a Promise in Next 16 (`const { slug } = await params`); `notFound()` when missing or `draft` (unless admin). Wrapper sets `--hue`. `<SceneTarget shape={t.glyph} hue={t.hue} />`. Header (game, title, mode, IST time, `Countdown`), CTA state: `You're in` + code (registered) / `Register` (open; goes to `/login?next=...` when logged out) / `Full` / `Registration closed`. Slot section wrapped in `<SceneZone shape="slots" hue slots={{ taken, max }}>` with `SlotMeter`. Rules (`whitespace-pre-line`), prize when set. **Room panel** rendered only when `reg && t.room`: room ID, password, note, each with a copy button (tiny client component); when registered but not yet published: "Room details appear here before the match." `AutoRefresh`. `generateMetadata` for the title.
- [ ] Register `page.tsx`: no user: `redirect('/login?next=/games/[slug]/register')`; already registered or not open: redirect to the game page. `<SceneTarget shape="slots" ... />`. `RegisterForm` (client, `useActionState(registerAction.bind(null, slug), null)`): team name when `teamSize > 1`; `teamSize` rows of name + in-game ID (`placeholder` = preset `idHint`), row 1 labelled Captain with the account name prefilled, rows revealing in sequence (CSS stagger); inline error region with `aria-live="polite"`; input kept on error; pending state on the button. On `ok`: `setBase({ shape: 'check', hue, burst: true })`, show the code in mono, a line about where room details will appear, buttons to `/me` and back to the game.
- [ ] **Verify:** sign up through the API with curl, pass the session cookie to `shots.mjs`, capture game page (top, slots section in view, both widths), register form, and the success state (`--eval` fills and submits). Register the same user again with curl-free `--eval` and confirm the friendly error. Log out: `/games/x/register` redirects to login with `next`.
- [ ] **Commit** "Game page, team registration flow, room panel".

---

### Task 9: Auth pages and My games

**Files:** `src/app/(auth)/{login,signup,forgot-password,reset-password}/page.tsx`, `src/app/(auth)/AuthForm.tsx`, `src/app/(site)/me/{page.tsx,actions.ts}`.

**Consumes:** `authClient`, `getUser`, `listMine`, `cancelRegistration`.

- [ ] `AuthForm` (client): one component with `mode: 'login' | 'signup' | 'forgot' | 'reset'`. Calls `authClient.signIn.email`, `authClient.signUp.email({ name, email, phone, password })`, `authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })`, `authClient.resetPassword({ newPassword, token })` (token from `?token=`). Shows `error.message` inline. `forgot` always answers "If that email has an account, a reset link is on its way." After login/signup: `router.push(safeNext)` then `router.refresh()`, where `safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : '/'` (open-redirect guard). Signup fields: name, email, WhatsApp number (`type="tel"`, `autoComplete="tel"`), password (`minLength=8`, `autoComplete="new-password"`). Logged-in users visiting `/login` or `/signup` are redirected to `next` or `/`. `<SceneTarget shape="field" hue={null} />` on all four.
- [ ] `me/actions.ts`

```ts
'use server'
import { ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'
import { getUser } from '@/lib/auth'
import { cancelRegistration } from '@/lib/tournaments'

export async function cancelAction(form: FormData) {
  const user = await getUser()
  const id = String(form.get('id') ?? '')
  if (!user || !ObjectId.isValid(id)) return
  await cancelRegistration(new ObjectId(id), user.id)
  revalidatePath('/me'); revalidatePath('/')
}
```

- [ ] `me/page.tsx`: redirect to `/login?next=/me` when logged out. Each registration: game, title, IST time, countdown, team and players, code, room details (or the "appear here" line), Cancel button (with a native `confirm()` wrapper client component) only while `now < regClosesAt`. Empty state links to `/#games`.
- [ ] **Verify:** screenshots of all four auth pages and `/me` (with and without registrations) at both widths; forgot-password prints a link in the dev log and that link resets the password; cancel frees the slot on the home page.
- [ ] **Commit** "Auth pages, password reset, My games".

---

### Task 10: Admin panel

**Files:** `src/app/admin/{layout.tsx,page.tsx,actions.ts,TournamentForm.tsx}`, `src/app/admin/games/new/page.tsx`, `src/app/admin/games/[id]/page.tsx`, `src/app/admin/games/[id]/export/route.ts`.

**Consumes:** `requireAdmin`, `isUnverifiedAdmin`, `listAll`, `getById`, `listRegistrations`, `saveTournament`, `deleteTournament`, `setStatus`, `setRoom`, `recountSlots`, `cancelRegistration`, `tournamentInput`, `roomInput`, `STATUSES`, `PRESETS`, `utcToIstInput`, `toCsv`, `formatIst`.

- [ ] `actions.ts`: every export starts with `await requireAdmin()`.

```ts
'use server'
import { ObjectId } from 'mongodb'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { tournamentInput, roomInput, STATUSES } from '@/lib/schemas'
import { saveTournament, deleteTournament, setStatus, setRoom, recountSlots, cancelRegistration } from '@/lib/tournaments'

export type FormState = { ok: false; error: string } | null
const oid = (v: FormDataEntryValue | null) => (ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null)
const fresh = () => { revalidatePath('/', 'layout') }

export async function saveTournamentAction(id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin()
  const parsed = tournamentInput.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  const _id = id ? oid(id) : null
  if (id && !_id) return { ok: false, error: 'Bad id' } // never fall through to "create" on a mangled id
  const res = await saveTournament(_id, parsed.data)
  if (!res.ok) return res
  fresh()
  redirect(`/admin/games/${res.id.toHexString()}`)
}
export async function setStatusAction(form: FormData) {
  await requireAdmin()
  const id = oid(form.get('id')); const status = STATUSES.find(s => s === form.get('status'))
  if (id && status) { await setStatus(id, status); fresh() }
}
export async function publishRoomAction(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin()
  const _id = oid(id); if (!_id) return { ok: false, error: 'Bad id' }
  if (form.get('intent') === 'unpublish') { await setRoom(_id, null); fresh(); return null }
  const parsed = roomInput.safeParse(Object.fromEntries(form))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  await setRoom(_id, parsed.data); fresh(); return null
}
export async function removeRegistrationAction(form: FormData) {
  await requireAdmin()
  const id = oid(form.get('id')); if (id) { await cancelRegistration(id, null); fresh() }
}
export async function recountAction(form: FormData) {
  await requireAdmin()
  const id = oid(form.get('id')); if (id) { await recountSlots(id); fresh() }
}
export async function deleteTournamentAction(form: FormData) {
  await requireAdmin()
  const id = oid(form.get('id'))
  if (id && (await deleteTournament(id))) { fresh(); redirect('/admin') }
}
```

- [ ] `layout.tsx`: `getUser()`; if `isUnverifiedAdmin(user)` render the "verify your email to unlock admin" notice with a resend button (`authClient.sendVerificationEmail({ email, callbackURL: '/admin' })`); otherwise `await requireAdmin()`. `<SceneTarget shape="field" hue={null} />`. `metadata.robots = { index: false }`.
- [ ] `page.tsx`: table (cards on phone) of all tournaments: game, title, IST time, status, `taken / max`, quick Open/Close toggle (form with `setStatusAction`), Edit link, "Add game" primary button.
- [ ] `TournamentForm` (client, `useActionState`): preset `<select>` that prefills gameName, glyph, hue, teamSize on change; title, mode, `datetime-local` starts (labelled IST), optional `datetime-local` registration closes, team size and max slots (`type="number"`), glyph picker (five radio buttons showing `GlyphIcon`), hue `type="range"` with a live swatch, rules `<textarea>`, prize, status `<select>`. Defaults from `utcToIstInput`.
- [ ] `games/[id]/page.tsx`: edit form; room form (ID, password, note; Publish / Unpublish); registrations table: #, team, players with in-game IDs, phone (as a `https://wa.me/<digits>` link), email, registered at, code, Remove (confirm); Recount slots; Export CSV link; Delete game (only offered when `slotsTaken === 0`); link to the public page.
- [ ] `export/route.ts`

```ts
import { requireAdmin } from '@/lib/admin'
import { getById, listRegistrations } from '@/lib/tournaments'
import { toCsv } from '@/lib/csv'
import { formatIst } from '@/lib/time'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const t = await getById((await params).id)
  if (!t) return new Response('Not found', { status: 404 })
  const regs = await listRegistrations(t._id)
  const head = ['#', 'Code', 'Team', 'Captain', 'Phone', 'Email', 'Registered', ...Array.from({ length: t.teamSize }, (_, i) => [`Player ${i + 1}`, `ID ${i + 1}`]).flat()]
  const rows = regs.map((r, i) => [i + 1, r.code, r.teamName ?? '', r.players[0].name, r.phone, r.email, formatIst(r.createdAt), ...r.players.flatMap(p => [p.name, p.inGameId])])
  return new Response('﻿' + toCsv([head, ...rows]), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${t.slug}.csv"` },
  })
}
```

- [ ] **Verify:** as a normal user `/admin` and the export URL return 404 and a direct POST of an admin action fails; as a listed but unverified user the notice shows; after clicking the logged verification link the panel opens. Create a custom game ("Chess Blitz", solo, 8 slots, hue 150), see it on the home page in its colour; lower max slots below taken and get the error; publish a room and see it on the registrant's game page and `/me` but not for another user; export opens cleanly. Screenshots of all three admin pages at both widths.
- [ ] **Commit** "Admin: games, room publishing, registrations, CSV export".

---

### Task 11: Whole-site verification and handover

- [ ] `npm test` (7 pass), `npm run lint`, `npm run build` all clean.
- [ ] Full walkthrough on a fresh database (`npm run seed -- --reset`) driven through `shots.mjs --eval`: sign up, register a squad, see the success burst, `/me` shows it, admin publishes a room, player sees it, second player fills the last slot of a 1-slot game, third sees `Full`.
- [ ] Re-shoot every route at both widths; fix anything that fails the Global Constraints (contrast over particles, 44 px targets, no horizontal scroll at 390 px, copy rules).
- [ ] Real-GPU frame check on the home page: launch Chrome with `--enable-gpu --use-angle=gl-egl --ozone-platform=headless` and log average frame time over 5 s via `--eval`; desktop under 16.7 ms.
- [ ] `README.md`: local setup (podman Mongo, env, seed, dev), going live (Atlas URI with `0.0.0.0/0` network access for Vercel, `BETTER_AUTH_URL` = the production URL, Resend needs a **verified domain** to mail anyone but yourself, `ADMIN_EMAILS` + click the verification mail), and the v1 ceilings (polling, no waitlist, slot recount).
- [ ] Commit, then start `npm run dev` in the background, confirm `curl -sI localhost:3000` is 200, and leave it running.
