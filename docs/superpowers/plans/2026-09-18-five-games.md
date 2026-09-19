# Five games and game art: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clutch offers exactly five games with fixed team sizes, shows each game's official art and motion, enforces unique in-game IDs per contest, fixes the captain edit flow, relabels the phone field, and drops password reset.

**Architecture:** A node-safe rules catalog (`src/lib/games.ts`) decides name and team size server-side; a separate art catalog (`src/lib/game-art.ts`) statically imports official WebP art for next/image. The particle swarm samples each game's logo from `public/games/<key>/mask.png`. Team rules stay in `src/lib/tournaments.ts`, where every register/edit path already converges.

**Tech Stack:** Next 16.3.5 (App Router, Turbopack), React 19.2, Tailwind 4, plain three.js, MongoDB driver 7, better-auth 1.7, zod 4, node:test.

**Spec:** `docs/superpowers/specs/2026-09-18-five-games-design.md`

## Global Constraints

- Brand: Clutch Black `#050505`, Carbon `#111111`, Steel White `#F2F2F2`, Clutch Red `#FF1A1A`. Red only for actions, live signals, focus and errors. Success messages are white. Game art stays full colour.
- Visible copy: no em-dashes, no tracked all-caps eyebrows on every section, no `→` glyphs on links, never accent a single headline word.
- Read the matching guide in `node_modules/next/dist/docs/` before using a Next API. In this version `priority` on `<Image>` is deprecated (use `preload` or `fetchPriority="high"`), `images.qualities` defaults to `[75]`, and `redirect()` in a server action pushes unless given `RedirectType.replace`.
- Local Mongo: `podman start clutch-mongo`; the URI host is `127.0.0.1`, never `localhost`.
- Dev preview on port 3100 (`npx next dev -p 3100`), the user's own port 3000 stays free. Kill servers by port (`ss -ltnpH 'sport = :3100'`), never `pkill -f "next start"`.
- Screenshots: `node scripts/shots.mjs <path>@<name> --only desktop|phone --cookie "better-auth.session_token=..."`. Headless Chrome reports reduced motion unless the script overrides it (it does) and reports `(hover: none)`, so `@media (hover: hover)` effects cannot be captured.
- `notFound()` serves HTTP 200 here: assert on the not-found body, not the status.
- Tailwind sources are listed by hand in `globals.css` (`source(none)` + `@source`); do not remove those lines.
- Load the design skills `redesign-existing-projects`, `design-taste-frontend`, `high-end-visual-design` and `frontend-design` before Tasks 6, 7 and 8.
- Tests: `npm test` (node --test against the `clutch_test` database).

## File map

| File | Change |
|---|---|
| `src/lib/schemas.ts` | imports `GAMES` from `games.ts`; `GLYPHS`/`Glyph` gone; `tournamentInput` loses `gameName`, `glyph`, `hue`, `teamSize` |
| `src/lib/games.ts` | `GAMES`, `Game`, `GAME` catalog, `isGame`, `teamLabel`; no imports; `PRESETS` and `GLYPH_PATHS` gone |
| `src/lib/game-art.ts` | new: `ART` record of static art imports |
| `src/lib/tournaments.ts` | in-game ID rules, retired-game filters, team size from `GAME`, game lock |
| `src/assets/games/<key>/*.webp`, `src/assets/games/SOURCES.md`, `public/games/<key>/{mask.png,loop.mp4}` | new official assets |
| `src/components/GameIcon.tsx` | new, replaces `GlyphIcon.tsx` (deleted) |
| `src/components/GameBanner.tsx`, `src/components/LoopVideo.tsx` | new |
| `src/components/GameChapter.tsx` | new (home) |
| `src/components/GameCard.tsx` | rewritten |
| `src/components/GameList.tsx` | deleted |
| `src/components/scene/{scene-store,shapes,swarm,SceneTarget}.ts(x)` | game logo shapes; `useSceneHover` deleted |
| `src/app/admin/TournamentForm.tsx` and admin pages | five-game dropdown, fixed team size |
| `src/app/(site)/**` | pages use `GAME`/`ART`; home rewritten |
| `src/app/(auth)/**`, `src/lib/auth.ts`, `src/lib/users.ts`, `src/lib/mail.ts` | NIAT label; reset removed |

---

### Task 1: Sign-up asks for the NIAT registered number, and password reset is gone

**Files:**
- Delete: `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, `src/lib/mail.ts`
- Modify: `src/lib/auth.ts`, `src/app/(auth)/AuthForm.tsx`, `src/app/(auth)/actions.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/lib/users.ts`, `.env.example`, `README.md`
- Test: `test/signup.test.ts`

**Interfaces:** Produces `AuthForm({ mode: 'login' | 'signup', next?: string })`.

- [ ] **Step 1: Update the failing test.** In `test/signup.test.ts` change the first test's expected message:

```ts
test('bad fields are refused even on an empty database', async () => {
  assert.deepEqual(await signupGate({ phone: '123', collegeId: 'ADMIN001' }), { ok: false, message: 'Enter a valid NIAT registered number' })
  assert.deepEqual(await signupGate({ phone: '9876543210', collegeId: '!' }), { ok: false, message: 'Enter a valid college ID' })
})
```

and in the last test add, after the `/already exists for this college ID/` assertion:

```ts
  assert.doesNotMatch((again as { message: string }).message, /reset/)
```

- [ ] **Step 2: Run it and watch it fail.** `npm test 2>&1 | grep -E "✖|fail "` shows `bad fields are refused` and `one college ID gets one account` failing.

- [ ] **Step 3: Change the gate messages** in `src/lib/users.ts`:

```ts
  if (!phone.success) return { ok: false, message: 'Enter a valid NIAT registered number' }
```
```ts
    return { ok: false, message: 'That college ID and NIAT registered number are not on the student list together. Check both, or ask the organisers to add you.' }
```
```ts
    return { ok: false, message: 'An account already exists for this college ID. Log in instead.' }
```

- [ ] **Step 4: Run tests.** `npm test` passes (32 tests).

- [ ] **Step 5: Remove reset from better-auth** in `src/lib/auth.ts`: delete `import { sendMail } from './mail.ts'` and replace the `emailAndPassword` block with

```ts
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // No sendResetPassword: reset is off until it returns another way. Without it better-auth refuses its own
    // reset endpoint, so no route on this site can send mail.
  },
```

Then `git rm src/lib/mail.ts "src/app/(auth)/forgot-password/page.tsx" "src/app/(auth)/reset-password/page.tsx"`.

- [ ] **Step 6: Rewrite `src/app/(auth)/AuthForm.tsx`:**

```tsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { authClient } from '@/lib/auth-client'
import { safeNext } from '@/lib/safe-next'
import { hasAccount } from './actions'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { Panel } from '@/components/Panel'

type Mode = 'login' | 'signup'
const COPY: Record<Mode, { title: string; submit: string; busy: string }> = {
  login: { title: 'Log in', submit: 'Log in', busy: 'Logging in' },
  signup: { title: 'Sign up', submit: 'Create account', busy: 'Creating account' },
}

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dest = safeNext(next)
  const withNext = (path: string) => (next ? `${path}?next=${encodeURIComponent(dest)}` : path)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    setError(''); setBusy(true)
    const res = mode === 'login'
      ? await authClient.signIn.email({ email: f.email, password: f.password })
      : await authClient.signUp.email({ name: f.name, email: f.email, phone: f.phone, collegeId: f.collegeId, password: f.password })
    setBusy(false)
    if (res.error) {
      // One code covers both halves of a failed login; ask which it was only once we know it failed.
      if (mode === 'login' && res.error.code === 'INVALID_EMAIL_OR_PASSWORD')
        return setError((await hasAccount(f.email)) ? 'Wrong password. Try again.' : 'No account with this email yet. Sign up below.')
      return setError(res.error.message ?? 'That did not work. Try again.')
    }
    router.push(dest)
    router.refresh() // the nav is a server component: re-render it with the new session
  }

  const c = COPY[mode]
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="display mb-6 text-4xl sm:text-5xl">{c.title}</h1>
      <Panel inner="p-5 sm:p-7">
        <form onSubmit={submit} className="flex flex-col gap-5">
          {mode === 'signup' && <Field label="Name" name="name" required minLength={2} maxLength={60} autoComplete="name" />}
          <Field label="Email" name="email" type="email" required autoComplete="email" inputMode="email" />
          {mode === 'signup' && (
            <>
              <Field label="College ID number" name="collegeId" required minLength={3} maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                placeholder="2203A51234" hint="Exactly as the college has it. Your account is only created if it matches the student list." />
              <Field label="NIAT registered number" name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="98765 43210"
                hint="The mobile number NIAT has on file for your college ID. No OTP." />
            </>
          )}
          <Field label="Password" name="password" type="password" required minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} hint={mode === 'login' ? undefined : 'At least 8 characters.'} />
          <p aria-live="polite" className={`text-danger ${error ? '' : 'hidden'}`}>{error}</p>
          <Button type="submit" disabled={busy}>{busy ? c.busy : c.submit}</Button>
        </form>
      </Panel>
      <p className="mt-5 text-muted">
        {mode === 'login' && <>New here? <Link className="font-semibold text-text underline underline-offset-4" href={withNext('/signup')}>Sign up</Link>.</>}
        {mode === 'signup' && <>Already have an account? <Link className="font-semibold text-text underline underline-offset-4" href={withNext('/login')}>Log in</Link>. Not on the student list yet? Ask the organisers to add you.</>}
      </p>
    </div>
  )
}
```

- [ ] **Step 7: Drop the `reset` banner** from `src/app/(auth)/login/page.tsx` and `src/app/(auth)/signup/page.tsx`. Login becomes:

```tsx
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { safeNext } from '@/lib/safe-next'
import { SceneTarget } from '@/components/scene/SceneTarget'
import { AuthForm } from '../AuthForm'
import { BackLink } from '@/components/BackLink'

export const metadata = { title: 'Log in' }

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  if (await getUser()) redirect(safeNext(next))
  return (
    <>
      <SceneTarget shape="field" hue={null} />
      <div className="mx-auto w-full max-w-md"><BackLink href="/">Home</BackLink></div>
      <AuthForm mode="login" next={next} />
    </>
  )
}
```

Signup is identical with `title: 'Sign up'`, `mode="signup"`.

- [ ] **Step 8: Fix the comment** in `src/app/(auth)/actions.ts`:

```ts
/**
 * better-auth answers "wrong password" and "no such email" with one message, to stop anyone probing which
 * addresses have accounts. We trade that away so a mistyped email is not mistaken for a wrong password:
 * signing up already answers the same question ("user already exists"), so this leaks nothing new.
 */
```

- [ ] **Step 9: Docs.** In `.env.example` delete the two Resend comment lines and `RESEND_API_KEY=` / `EMAIL_FROM=`. In `README.md`: stack line drops "Resend"; delete the "With `RESEND_API_KEY` empty..." paragraph; delete the `RESEND_API_KEY`, `EMAIL_FROM` row of the Going live table; add under Known ceilings: "- No password reset. It was removed on purpose and comes back later with a different approach." Replace "mobile number" with "NIAT registered number" where the README describes sign-up.

- [ ] **Step 10: Verify.** `npx tsc --noEmit && npm run lint && npm test`. With the dev server on :3100:

```bash
curl -s localhost:3100/forgot-password | grep -c "could not find\|not found"     # >= 1: the page is gone
curl -s localhost:3100/login | grep -ci "reset"                                     # 0
curl -s -X POST -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' \
  localhost:3100/api/auth/request-password-reset -d '{"email":"asha@example.com"}'   # an error, not {"status":true}
curl -s localhost:3100/signup | grep -c "NIAT registered number"                    # 1
```

- [ ] **Step 11: Commit.** `git add -A && git commit -m "Sign-up asks for the NIAT registered number; password reset removed"`

---

### Task 2: In-game IDs are unique per contest

**Files:**
- Modify: `src/lib/tournaments.ts` (`TeamError`, `buildRoster`, `findClash`)
- Modify: `src/app/(site)/games/[slug]/register/actions.ts`, `src/app/admin/teams/[id]/actions.ts` (messages)
- Test: `test/team.test.ts`

**Interfaces:** Produces two `TeamError` variants: `{ code: 'duplicate_ign'; inGameId: string }` and `{ code: 'ign_taken'; inGameId: string; name: string; teamName: string }`.

- [ ] **Step 1: Give fixtures distinct in-game IDs.** In `test/team.test.ts` replace the `roster` helper, and the two literal rosters that reuse one ID (`inGameId: 'x'` in the captain-edit test, `inGameId: 'i'` in the admin-table test) with per-player IDs:

```ts
const roster = (ids: string[]) => ({ teamName: 'Team', players: ids.map(collegeId => ({ collegeId, inGameId: `ign-${collegeId}` })) })
```
```ts
  assert.equal((await editTeam(team._id, captain(a), { teamName: 'Renamed', players: [a, sub].map(collegeId => ({ collegeId, inGameId: `x-${collegeId}` })) })).ok, true)
```
```ts
  await registerTeam(c, captain(a), { teamName: 'Falcons', players: [a, b].map(collegeId => ({ collegeId, inGameId: `i-${collegeId}` })) })
  await registerTeam(c, captain(x, VJ), { teamName: 'Ravens', players: [x, y].map(collegeId => ({ collegeId, inGameId: `i-${collegeId}` })) })
```

- [ ] **Step 2: Write the failing tests** (append to `test/team.test.ts`):

```ts
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
```

- [ ] **Step 3: Run and watch them fail.** `npm test 2>&1 | grep -E "✖"` lists the first two new tests (the third passes already).

- [ ] **Step 4: Implement** in `src/lib/tournaments.ts`. Add to `TeamError`:

```ts
  | { code: 'duplicate_ign'; inGameId: string }
  | { code: 'ign_taken'; inGameId: string; name: string; teamName: string }
```

Below the `TeamError` type:

```ts
// In-game IDs match ignoring case (ICU strength 2: case-blind, accent-aware). The query collation and sameIgn are
// the same rule, so the database and the error message never disagree about what counts as a match.
const CI = { locale: 'en', strength: 2 } as const
const sameIgn = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'accent' }) === 0
```

In `buildRoster`, right after the `duplicate_player` line:

```ts
  const igns = input.players.map(p => p.inGameId.trim()).filter(Boolean)
  const twin = igns.find((g, i) => igns.findIndex(h => sameIgn(g, h)) !== i)
  if (twin) return fail({ code: 'duplicate_ign', inGameId: twin })
```

Replace `findClash`:

```ts
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
```

- [ ] **Step 5: Messages.** Both `message()` switches are exhaustive, so TypeScript fails until they cover the new codes. In `src/app/(site)/games/[slug]/register/actions.ts` add:

```ts
    case 'duplicate_ign': return `Two players have the same in-game ID (${e.inGameId}). Every player needs their own.`
    case 'ign_taken': return `In-game ID ${e.inGameId} is already used by ${e.name} on ${e.teamName} in this contest.`
```

and the same two lines in `src/app/admin/teams/[id]/actions.ts`.

- [ ] **Step 6: Verify.** `npm test` (35 tests pass), `npx tsc --noEmit`.

- [ ] **Step 7: Commit.** `git commit -am "In-game IDs are unique per contest, case-insensitive"`

---

### Task 3: A captain's edit lands on the confirmation

**Files:**
- Modify: `src/app/(site)/games/[slug]/register/actions.ts`, `src/app/(site)/games/[slug]/register/page.tsx`

Root cause (reproduced 2026-09-18 with the demo captain in headless Chrome): the edit saves, but the page stays on `?edit=1` and the form renders only errors, so a successful save looks like nothing happened.

- [ ] **Step 1: Redirect after a successful edit.** In `actions.ts` import `import { redirect, RedirectType } from 'next/navigation'` and end `registerAction` with:

```ts
  if (!res.ok) return fail(message(res.error))
  revalidatePath('/', 'layout') // home list, this page (which now renders the confirmation), /me
  // An edit used to re-render the form it came from, with nothing to say it had worked. Land on the confirmation,
  // replacing the edit URL so Back does not reopen the form. Outside any try: redirect() works by throwing.
  if (teamId) redirect(`/games/${t.slug}/register?saved=1`, RedirectType.replace)
  return { ok: true }
```

- [ ] **Step 2: Say it on the confirmation.** In `page.tsx`: `searchParams: Promise<{ edit?: string; saved?: string }>`, `const { edit, saved } = await searchParams`, and as the first child of the `done` block:

```tsx
            {saved && (
              <p role="status" style={{ '--i': 0 } as CSSProperties} className="rounded-full bg-white/[0.08] px-4 py-2 text-sm font-semibold text-text ring-1 ring-inset ring-white/15">
                Changes saved.
              </p>
            )}
```

- [ ] **Step 3: Verify end to end.** Sign in the demo captain through the API and drive the edit form:

```bash
S=/tmp/claude-1000/-home-rushikumar-Documents-Clutch/c285f710-07f9-4a29-9aa0-ae884bd46aac/scratchpad
curl -s -c $S/jar -H 'Content-Type: application/json' -H 'Origin: http://localhost:3000' -X POST localhost:3100/api/auth/sign-in/email -d '{"email":"asha@example.com","password":"password123"}' >/dev/null
COOKIE=$(grep session_token $S/jar | awk '{print $6"="$7}')
node scripts/shots.mjs "/games/friday-night-scrims-7jbf/register?edit=1@edit-saved" --only phone --out $S/shots --cookie "$COOKIE" --wait 3000 \
  --eval "(async () => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }; set([...document.querySelectorAll('input[name=inGameId]')][3], 'IGN003-b'); document.querySelector('button[type=submit]').click(); await new Promise(r => setTimeout(r, 4000)); return JSON.stringify({ url: location.href, status: document.querySelector('[role=status]')?.textContent, h1: document.querySelector('h1')?.textContent }) })()"
```

Expected: `url` ends `/register?saved=1`, `status` is `Changes saved.`, `h1` is `You're in`. Then set the same in-game ID as player 2's and confirm the error names it.

- [ ] **Step 4: Commit.** `git commit -am "A captain's edit lands on the confirmation with 'Changes saved'"`

---

### Task 4: Official game assets

**Files:** Create `src/assets/games/<key>/{icon,logo,art,hero}.webp` for `freefire`, `bgmi`, `codm`, `valorant`, `matiks`; `public/games/<key>/mask.png`; `public/games/{valorant,freefire}/loop.mp4`; `src/assets/games/SOURCES.md`.

**Interfaces:** Produces the files Task 5's `ART` imports. `hero.webp` is a transparent character cutout except where a game has no official one (recorded as `cutout: false` in Task 5); for Matiks it is an app screenshot.

- [ ] **Step 1: Source** from official pages and press kits only (publisher sites, official asset kits, official store listings). Leads: Riot's VALORANT Asset Kit, ff.garena.com brand and characters pages, battlegroundsmobileindia.com, callofduty.com/mobile, matiks.in, and each game's Google Play listing.
- [ ] **Step 2: Process** with `magick`/`sharp`: icon 256x256; logo transparent, legible on `#050505`, max 1000px wide; art max 1920px wide, about 300 KB or less; hero trimmed, max 1400px tall, about 350 KB or less; mask white on transparent, 512px long side, thresholded alpha; loops 5 to 8 s, 1280x720 or less, H.264 yuv420p, faststart, no audio, 2 MB or less.
- [ ] **Step 3: Record** every file's source URL and owner in `SOURCES.md`.
- [ ] **Step 4: Review** a contact sheet of all 25 images on `#050505`; replace anything cluttered with baked-in text or centred on a weapon. `du -ch src/assets/games public/games | tail -1` stays under 8 MB.
- [ ] **Step 5: Commit.** `git add src/assets/games public/games && git commit -m "Official game art for the five games, with sources"`

---

### Task 5: The five games everywhere (catalog, contest rules, admin form, icons, swarm logos)

**Files:**
- Modify: `src/lib/schemas.ts`, `src/lib/games.ts`, `src/lib/tournaments.ts`, `scripts/seed.ts`
- Create: `src/lib/game-art.ts`, `src/components/GameIcon.tsx`
- Modify: `src/app/admin/TournamentForm.tsx`, `src/app/admin/games/new/page.tsx`, `src/app/admin/games/[id]/page.tsx`, `src/app/admin/page.tsx`
- Modify: `src/app/(site)/games/page.tsx`, `src/app/(site)/games/[slug]/page.tsx`, `src/app/(site)/games/[slug]/register/page.tsx`, `src/app/(site)/games/[slug]/register/RegisterForm.tsx`, `src/app/(site)/me/page.tsx`, `src/components/GameCard.tsx`, `src/components/GameList.tsx`
- Modify: `src/components/scene/scene-store.ts`, `src/components/scene/shapes.ts`, `src/components/scene/swarm.ts`, `src/components/scene/SceneTarget.tsx`, `src/app/globals.css`
- Delete: `src/components/GlyphIcon.tsx`
- Test: `test/team.test.ts`

**Interfaces:**
- Consumes: Task 4's asset files.
- Produces (all from `@/lib/games`): `GAMES: readonly ['freefire','bgmi','codm','valorant','matiks']`, `type Game`; `GAME: Record<Game, { name: string; teamSize: number; idHint: string; platform: 'Mobile' | 'PC'; blurb: string }>`; `isGame(g: string): g is Game`; `teamLabel(n: number): string`; `ART: Record<Game, { icon: StaticImageData; logo: StaticImageData; art: StaticImageData; hero: StaticImageData; cutout: boolean; loop?: string }>`; `GameIcon({ game: string; size?: number; className?: string })`; `Shape = 'trophy' | 'field' | 'teams' | 'check' | Game`; `GameView` gains `game: Game` and loses `glyph`, `hue`.

- [ ] **Step 1: Write the failing tests** in `test/team.test.ts`. Imports gain `listOpen` from tournaments and `import { tournamentInput } from '../src/lib/schemas.ts'`. Drop `glyph` and `hue` from the `contest()` fixture and note why its team size is 2:

```ts
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
  game, title: 'T', mode: '', startsAt: '2030-01-01T20:00', regClosesAt: '', requireInGameId: true, rules: '', prize: '', status: 'open' as const,
})
```

Replace the old `contest edits cannot strand teams` test and add two:

```ts
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
```

- [ ] **Step 2: Run and watch them fail.** `npm test 2>&1 | grep -E "✖"`.

- [ ] **Step 3: `src/lib/schemas.ts`.** Delete the `GAMES`/`GLYPHS` lines and the `Game`/`Glyph` types (both move to `games.ts`, which has no imports, so the lazily loaded swarm can use them without pulling zod into its bundle), and import the list:

```ts
import { z } from 'zod'
import { GAMES } from './games.ts'

export const STATUSES = ['draft', 'open', 'closed', 'completed'] as const
export const ROLES = ['user', 'admin'] as const
export type Status = (typeof STATUSES)[number]
export type Role = (typeof ROLES)[number]
```

and `tournamentInput`:

```ts
// The game fixes the name and the team size (GAME in games.ts); the form only says which game.
export const tournamentInput = z.object({
  game: z.enum(GAMES),
  title: text(80).min(3, 'Title is too short'),
  mode: text(80),
  startsAt: istLocal,
  regClosesAt: istLocal.or(z.literal('')),
  // which colleges may see and enter this contest. No cap on teams: any number may register.
  branches: z.array(text(60)).min(1, 'Pick at least one college'),
  requireInGameId: z.coerce.boolean(),
  rules: text(5000),
  prize: text(120),
  status: z.enum(STATUSES),
})
```

- [ ] **Step 4: `src/lib/games.ts`** becomes (no imports at all; every file that used `Game`/`GAMES` from `@/lib/schemas` now takes them from `@/lib/games`):

```ts
export const GAMES = ['freefire', 'bgmi', 'codm', 'valorant', 'matiks'] as const
export type Game = (typeof GAMES)[number]

/**
 * The five games, and the only place their rules live. Team size belongs to the game, not the contest:
 * saveTournament copies it from here, so no form can put five players in a BGMI squad.
 * No image imports: node --test loads this file. The art is in game-art.ts.
 */
export const GAME: Record<Game, { name: string; teamSize: number; idHint: string; platform: 'Mobile' | 'PC'; blurb: string }> = {
  freefire: { name: 'Free Fire MAX', teamSize: 4, idHint: 'Player UID, e.g. 1234567890', platform: 'Mobile', blurb: 'Ten-minute battle royale. Fifty players land, and one squad is left standing.' },
  bgmi:     { name: 'BGMI',          teamSize: 4, idHint: 'Character ID, e.g. 5123456789', platform: 'Mobile', blurb: 'A hundred players drop onto one island. The last squad alive takes it.' },
  codm:     { name: 'COD Mobile',    teamSize: 5, idHint: 'Player UID, e.g. 6749128374650192837', platform: 'Mobile', blurb: 'Five on five on classic Call of Duty maps, settled round by round.' },
  valorant: { name: 'Valorant',      teamSize: 5, idHint: 'Riot ID, e.g. Name#TAG', platform: 'PC', blurb: 'Tactical five on five. Plant the Spike or stop it, one round at a time.' },
  matiks:   { name: 'Matiks',        teamSize: 1, idHint: 'Matiks username', platform: 'Mobile', blurb: 'Head to head mental maths. Out-calculate the player across from you.' },
}

/** Contests saved before the five (a "Code Sprint") are still in the database. Players never see them. */
export const isGame = (g: string): g is Game => Object.hasOwn(GAME, g)

export const teamLabel = (n: number) => (n === 1 ? 'Solo' : n === 2 ? 'Duo' : n === 4 ? 'Squad of 4' : `Team of ${n}`)
```

- [ ] **Step 5: `src/lib/tournaments.ts`.** Imports: `import { GAME, GAMES, isGame, type Game } from './games.ts'` and `import type { Status, TournamentInput, TeamInput, RoomInput } from './schemas.ts'`. `Tournament` loses `glyph` and `hue`:

```ts
export type Tournament = {
  _id: ObjectId; slug: string; game: Game; gameName: string; title: string; mode: string
  startsAt: Date; regClosesAt: Date; teamSize: number // gameName and teamSize are copied from GAME on save
  branches: string[]        // the colleges this contest is open to; nobody else sees it
  requireInGameId: boolean
  rules: string; prize: string; status: Status; room: Room | null; createdAt: Date; updatedAt: Date
}
```

`toView` returns `game: t.game` instead of `glyph`/`hue`:

```ts
export const toView = (t: Tournament, teamCount: number, locations: string[], now = new Date()) => ({
  slug: t.slug, game: t.game, gameName: t.gameName, title: t.title, mode: t.mode,
  startsAt: t.startsAt.toISOString(), startsLabel: formatIst(t.startsAt),
  teamSize: t.teamSize, teams: teamCount, locations, open: isRegOpen(t, now),
})
```

`listOpen` adds `game: { $in: [...GAMES] }` to its filter; `listMine`'s tournament lookup becomes `tournaments().find({ _id: { $in: mine.map(r => r.tournamentId) }, game: { $in: [...GAMES] } })`. In `registerTeam` and `editTeam` replace `if (!t) return ... not_found` with `if (!t || !isGame(t.game)) return { ok: false, error: { code: 'not_found' } }`.

In `saveTournament`:

```ts
  const { name: gameName, teamSize } = GAME[input.game]
  const fields = { ...rest, gameName, teamSize, startsAt: starts, regClosesAt: closes, updatedAt: new Date() }
```

and replace the team-size lock with:

```ts
  // The game (and with it the team size) is locked once anyone has registered, and a college cannot be dropped while
  // it has teams: both would strand real registrations. Checked here rather than in the filter, so each gets its own message.
  const registered = await teams().find({ tournamentId: id, status: 'confirmed' }, { projection: { branch: 1 } }).toArray()
  if (registered.length) {
    const current = await tournaments().findOne({ _id: id })
    if (current && (current.game !== input.game || current.teamSize !== teamSize)) {
      return { ok: false as const, error: 'The game is locked once teams have registered.' }
    }
```

- [ ] **Step 6: Run tests.** `npm test` passes (37 tests).

- [ ] **Step 7: `src/lib/game-art.ts`:**

```ts
import type { StaticImageData } from 'next/image'
import type { Game } from './games'
import freefireIcon from '@/assets/games/freefire/icon.webp'
import freefireLogo from '@/assets/games/freefire/logo.webp'
import freefireArt from '@/assets/games/freefire/art.webp'
import freefireHero from '@/assets/games/freefire/hero.webp'
import bgmiIcon from '@/assets/games/bgmi/icon.webp'
import bgmiLogo from '@/assets/games/bgmi/logo.webp'
import bgmiArt from '@/assets/games/bgmi/art.webp'
import bgmiHero from '@/assets/games/bgmi/hero.webp'
import codmIcon from '@/assets/games/codm/icon.webp'
import codmLogo from '@/assets/games/codm/logo.webp'
import codmArt from '@/assets/games/codm/art.webp'
import codmHero from '@/assets/games/codm/hero.webp'
import valorantIcon from '@/assets/games/valorant/icon.webp'
import valorantLogo from '@/assets/games/valorant/logo.webp'
import valorantArt from '@/assets/games/valorant/art.webp'
import valorantHero from '@/assets/games/valorant/hero.webp'
import matiksIcon from '@/assets/games/matiks/icon.webp'
import matiksLogo from '@/assets/games/matiks/logo.webp'
import matiksArt from '@/assets/games/matiks/art.webp'
import matiksHero from '@/assets/games/matiks/hero.webp'

/**
 * Each game's official art (sources: src/assets/games/SOURCES.md). `cutout` means the hero is a character on a
 * transparent background; otherwise it is a photo the layout frames itself (Matiks: a phone screen).
 * `loop` only where the publisher ships video. The particle logo is public/games/<key>/mask.png.
 */
export type GameArt = { icon: StaticImageData; logo: StaticImageData; art: StaticImageData; hero: StaticImageData; cutout: boolean; loop?: string }

export const ART: Record<Game, GameArt> = {
  freefire: { icon: freefireIcon, logo: freefireLogo, art: freefireArt, hero: freefireHero, cutout: true, loop: '/games/freefire/loop.mp4' },
  bgmi:     { icon: bgmiIcon, logo: bgmiLogo, art: bgmiArt, hero: bgmiHero, cutout: true },
  codm:     { icon: codmIcon, logo: codmLogo, art: codmArt, hero: codmHero, cutout: true },
  valorant: { icon: valorantIcon, logo: valorantLogo, art: valorantArt, hero: valorantHero, cutout: true, loop: '/games/valorant/loop.mp4' },
  matiks:   { icon: matiksIcon, logo: matiksLogo, art: matiksArt, hero: matiksHero, cutout: false },
}
```

Set `cutout` and `loop` per game from Task 4's report.

- [ ] **Step 8: `src/components/GameIcon.tsx`** (and `git rm src/components/GlyphIcon.tsx`):

```tsx
import Image from 'next/image'
import { ART } from '@/lib/game-art'
import { isGame } from '@/lib/games'

/** The game's official app icon. A retired game (not one of the five) gets a plain tile instead of a crash. */
export function GameIcon({ game, size = 40, className = '' }: { game: string; size?: number; className?: string }) {
  const cls = `shrink-0 rounded-[22%] ${className}`
  if (!isGame(game)) return <span aria-hidden className={`${cls} inline-block bg-white/10`} style={{ width: size, height: size }} />
  return <Image src={ART[game].icon} alt="" width={size} height={size} className={cls} />
}
```

- [ ] **Step 9: Swarm logo shapes.** `scene-store.ts`: `import type { Game } from '@/lib/games'` and `export type Shape = 'trophy' | 'field' | 'teams' | 'check' | Game`. In `shapes.ts` replace the `GLYPH_PATHS` import and `fromPath` with:

```ts
import { GAMES, type Game } from '@/lib/games'
import type { Target } from './scene-store'

const CHECK = 'M20 54l20 20 42-46' // the "you're in" burst: a stroke 12 wide in a 100x100 box

function canvas(N: number) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = N
  return cv.getContext('2d', { willReadFrequently: true })
}

/** Scatter points over a canvas's opaque pixels, fitted to a 3-unit box so every shape has the same visual weight. */
function fromAlpha(ctx: CanvasRenderingContext2D, N: number, count: number, depth = 0.22) {
  const alpha = ctx.getImageData(0, 0, N, N).data
  const filled: number[] = []
  let x0 = N, x1 = 0, y0 = N, y1 = 0
  for (let p = 0; p < N * N; p++) {
    if (alpha[p * 4 + 3] <= 128) continue
    filled.push(p)
    const x = p % N, y = (p / N) | 0
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
  }
  if (!filled.length) return field(count)
  const k = 3 / Math.max(x1 - x0 + 1, y1 - y0 + 1), cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const p = filled[(rand() * filled.length) | 0]
    out[i * 3] = ((p % N) + rand() - cx) * k
    out[i * 3 + 1] = -(((p / N) | 0) + rand() - cy) * k
    out[i * 3 + 2] = (rand() - 0.5) * depth
  }
  return out
}

function check(count: number) {
  const N = 256, ctx = canvas(N)
  if (!ctx) return field(count)
  ctx.scale(N / 100, N / 100)
  ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'
  ctx.stroke(new Path2D(CHECK))
  return fromAlpha(ctx, N, count)
}

// Game logos are public/games/<key>/mask.png: white on transparent, loaded once by loadMasks().
const masks = new Map<Game, ImageBitmap>()
export const loadMasks = () => Promise.all(GAMES.map(async g => {
  try { masks.set(g, await createImageBitmap(await (await fetch(`/games/${g}/mask.png`)).blob())) }
  catch { /* a missing mask leaves that game on the loose field; nothing else depends on it */ }
}))

function fromMask(img: ImageBitmap, count: number) {
  const N = 384, ctx = canvas(N)
  if (!ctx) return field(count)
  const k = N / Math.max(img.width, img.height)
  ctx.drawImage(img, (N - img.width * k) / 2, (N - img.height * k) / 2, img.width * k, img.height * k)
  return fromAlpha(ctx, N, count)
}
```

and in `shapeFor`:

```ts
    if (t.shape === 'trophy') pts = trophy(count)
    else if (t.shape === 'field') pts = field(count)
    else if (t.shape === 'teams') pts = teamCloud(Math.max(0, t.teams ?? 0), count)
    else if (t.shape === 'check') pts = check(count)
    else {
      const m = masks.get(t.shape)
      if (!m) return field(count) // not loaded yet, and not cached, so the logo still arrives
      pts = fromMask(m, count)
    }
```

In `swarm.ts` import `loadMasks` from `./shapes` and `GAMES` from `@/lib/games`; add `let disposed = false` with the other state, set it in `dispose()`, and after `start()`:

```ts
  // masks land after the first frame: re-aim once they have, so a game page opened directly still gets its logo
  loadMasks().then(() => { if (!disposed && (GAMES as readonly string[]).includes(target.shape)) { shapeKey = ''; retarget(target) } })
```

In `SceneTarget.tsx` delete `useSceneHover` (and the `FocusEvent`, `PointerEvent`, `useMemo` imports it used).

- [ ] **Step 10: Admin form.** Rewrite `src/app/admin/TournamentForm.tsx`:

```tsx
'use client'
import Image from 'next/image'
import { useActionState, useState } from 'react'
import { GAME, GAMES, teamLabel, type Game } from '@/lib/games'
import { ART } from '@/lib/game-art'
import { STATUSES } from '@/lib/schemas'
import { Button } from '@/components/Button'
import { Field, Select, TextArea } from '@/components/Field'
import { saveTournamentAction, type FormState } from './actions'

export type TournamentValues = {
  game: Game; title: string; mode: string; startsAt: string; regClosesAt: string
  branches: string[]; requireInGameId: boolean; rules: string; prize: string; status: string
}
const STATUS_HINT = 'Draft is hidden. Open is listed and accepts registrations. Closed and Completed are hidden from the Games page.'

export function TournamentForm({ id, initial, locked, colleges }: { id: string | null; initial: TournamentValues; locked: boolean; colleges: { name: string; location: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveTournamentAction.bind(null, id), null)
  const kept = state && !state.ok ? state.values : undefined
  const [game, setGame] = useState<Game>(initial.game)
  const v = (k: keyof TournamentValues) => kept?.[k] ?? String(initial[k])
  const byLocation = [...new Set(colleges.map(c => c.location))].map(l => ({ location: l, names: colleges.filter(c => c.location === l).map(c => c.name) }))

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="grid items-start gap-5 sm:grid-cols-2">
        {/* a disabled select is not submitted, so a locked game travels in a hidden field */}
        {locked && <input type="hidden" name="game" value={game} />}
        <Select label="Game" name={locked ? undefined : 'game'} value={game} disabled={locked} onChange={e => setGame(e.target.value as Game)}
          hint={locked ? 'Locked: teams have already registered.' : 'Only these five. The game sets the team size.'}>
          {GAMES.map(g => <option key={g} value={g}>{GAME[g].name}</option>)}
        </Select>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text">Players per team</p>
          <p className="flex h-12 items-center gap-3 rounded-xl bg-ink/70 px-4 ring-1 ring-inset ring-line">
            <Image src={ART[game].icon} alt="" width={28} height={28} className="rounded-md" />
            <span className="font-semibold text-text">{teamLabel(GAME[game].teamSize)}</span>
            <span className="text-sm text-muted">set by the game</span>
          </p>
        </div>
      </div>
      <Field label="Title" name="title" required minLength={3} maxLength={80} defaultValue={v('title')} placeholder="Friday Night Scrims" />
      <Field label="Mode" name="mode" maxLength={80} defaultValue={v('mode')} placeholder="Squad TPP, Erangel" hint="Optional. Map, perspective, bracket style." />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts (IST)" name="startsAt" type="datetime-local" required defaultValue={v('startsAt')} />
        <Field label="Registration closes (IST)" name="regClosesAt" type="datetime-local" defaultValue={v('regClosesAt')} hint="Leave empty to close at start time." />
      </div>

      {/* the Colleges fieldset and the in-game ID checkbox stay exactly as they are today */}

      <TextArea label="Rules" name="rules" maxLength={5000} defaultValue={v('rules')} hint="Plain text. Line breaks are kept." />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Prize" name="prize" maxLength={120} defaultValue={v('prize')} hint="Optional. Entry is always free." />
        <Select label="Status" name="status" defaultValue={v('status')} hint={STATUS_HINT}>
          {STATUSES.map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>{pending ? 'Saving' : id ? 'Save changes' : 'Add game'}</Button>
        <p aria-live="polite" className={state?.ok ? 'text-text' : 'text-danger'}>{state?.ok ? state.message : state?.error}</p>
      </div>
    </form>
  )
}
```

(Keep the existing Colleges `<fieldset>` and the `requireInGameId` `<label>` blocks verbatim where the comment sits; they are unchanged.)

`src/app/admin/games/new/page.tsx` drops `PRESETS` and passes:

```tsx
        <TournamentForm id={null} locked={false} colleges={colleges} initial={{
          game: 'freefire', title: '', mode: '', startsAt: '', regClosesAt: '',
          branches: [], requireInGameId: true, rules: '', prize: '', status: 'open',
        }} />
```

`src/app/admin/games/[id]/page.tsx`: drop the `hue` class and `--hue` style on the root; import `isGame` from `@/lib/games`; under the title, for a retired game:

```tsx
        {!isGame(t.game) && <p className="mt-3 max-w-[60ch] text-muted">This contest is for a game Clutch no longer offers, so players cannot see it. Pick one of the five below, or remove its teams and delete it.</p>}
```

and pass `initial={{ game: isGame(t.game) ? t.game : 'freefire', title: t.title, mode: t.mode, startsAt: ..., regClosesAt: ..., branches: t.branches, requireInGameId: t.requireInGameId, rules: t.rules, prize: t.prize, status: t.status }}` (dates as today).

`src/app/admin/page.tsx`: drop `hue` from the `li`; replace the icon span content with `<GameIcon game={t.game} size={44} />` (remove the old span wrapper and the `GlyphIcon` import).

- [ ] **Step 11: Site pages.**
  - `games/[slug]/page.tsx`: `if (!t || !isGame(t.game) || (!visibleTo(t, user?.branch) && !isAdmin(user))) notFound()`; `<SceneTarget shape={t.game} hue={null} />`; `<GameIcon game={t.game} size={26} />` in place of `GlyphIcon`; `SceneFocus ... hue={null}`; drop `hue` class and style.
  - `register/page.tsx`: `if (!t || t.status === 'draft' || !isGame(t.game)) notFound()`; `SceneTarget shape="check" hue={null} burst` / `shape={t.game} hue={null}`; `idHint={GAME[t.game].idHint}` (import `GAME`, `isGame`, `teamLabel` from `@/lib/games`); drop `hue` class and style.
  - `RegisterForm.tsx` copy: `Type each player's college ID. Their name and number come from the student list, so there is nothing to spell wrong. Everyone has to be from <b>{branch}</b>.` (no em-dash).
  - `me/page.tsx`: `<GameIcon game={t.game} size={18} />`; drop `hue` class and style.
  - `GameCard.tsx`: remove `useSceneHover` and the `{...hover}` spread, drop `hue`, use `<GameIcon game={game.game} size={30} />`.
  - `GameList.tsx`: `<SceneStage shape={current.game} hue={null} ... />`.
  - `games/page.tsx`: filter by key. `const { game: raw = '', page: rawPage = '1' } = await searchParams`, `const game = isGame(raw) ? raw : ''`, `const present = GAMES.filter(k => all.some(g => g.game === k))`, `const shown = game ? all.filter(g => g.game === game) : all`; chips map `['', ...present]` with label `k ? GAME[k].name : 'All'` and a `<GameIcon game={k} size={20} />` before named chips; the empty-filter message says `No open ${GAME[game].name} contests.`
  - `globals.css`: delete the `.hue { --accent: var(--red); }` rule and its comment once `grep -rn '"hue\| hue ' src` finds no class usage.

- [ ] **Step 12: Seed.** In `scripts/seed.ts` drop `PRESETS`, and:

```ts
const seeds = [
  { game: 'freefire', title: 'Booyah Cup',             mode: 'Squad, Bermuda',           days: 3, hour: 20, prize: '',                branches: ['KKH', 'Vignana Jyothi'] },
  { game: 'bgmi',     title: 'Friday Night Scrims',    mode: 'Squad TPP, Erangel',       days: 2, hour: 21, prize: 'Bragging rights', branches: COLLEGE_NAMES },
  { game: 'codm',     title: 'Search and Destroy Cup', mode: '5v5, Search and Destroy',  days: 4, hour: 19, prize: '',                branches: COLLEGE_NAMES },
  { game: 'valorant', title: 'Spike Rush Showdown',    mode: '5v5, single elimination',  days: 5, hour: 19, prize: '',                branches: ['SR University'] },
  { game: 'matiks',   title: 'Mental Maths Duel',      mode: '1v1, best of three',       days: 6, hour: 18, prize: '',                branches: COLLEGE_NAMES },
] as const

for (const seed of seeds) {
  const r = await saveTournament(null, {
    game: seed.game, title: seed.title, mode: seed.mode, startsAt: at(seed.days, seed.hour), regClosesAt: '',
    branches: [...seed.branches], requireInGameId: true, rules: RULES, prize: seed.prize, status: 'open',
  })
  console.log(r.ok ? `seeded ${r.slug}` : r.error)
}
```

- [ ] **Step 13: Verify.** `npx tsc --noEmit && npm run lint && npm test`. On the dev server, as an admin (`t1@example.com`, signed up from roster row 2203A51005 / 9100000005, then `npm run promote t1@example.com`): add a COD Mobile and a Matiks contest through `/admin/games/new`, confirm the saved team sizes are 5 and 1, and that the Code Sprint contest shows the retired note and is absent from `/games`. Screenshot `/admin/games/new` and a contest page (desktop and phone) and check the swarm draws the game's logo.

- [ ] **Step 14: Commit.** `git add -A && git commit -m "Five fixed games: catalog, team size by game, official icons, logo swarm"`

---

### Task 6: The game's art on the Details and Register pages

**Files:**
- Create: `src/components/LoopVideo.tsx`, `src/components/GameBanner.tsx`
- Modify: `src/app/(site)/games/[slug]/page.tsx`, `src/app/(site)/games/[slug]/register/page.tsx`, `src/app/globals.css`

**Interfaces:** Produces `LoopVideo({ src: string; className?: string })` and `GameBanner({ game: Game; className?: string })`, reused by Tasks 7 and 8.

- [ ] **Step 1: `LoopVideo.tsx`:**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * A muted publisher loop that loads and plays only while on screen, and never under reduced motion or Data Saver:
 * the key art underneath stays, which is what those settings ask for. It fades in once it is actually playing.
 */
export function LoopVideo({ src, className = '' }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const v = ref.current!
    const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData
    if (saveData || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return v.pause()
      if (!v.getAttribute('src')) v.src = src
      v.play().catch(() => {}) // autoplay refused: the art stays, nothing to report
    }, { threshold: 0.25 })
    io.observe(v)
    return () => io.disconnect()
  }, [src])
  return <video ref={ref} muted loop playsInline preload="none" aria-hidden onPlaying={() => setPlaying(true)}
    className={`transition-opacity duration-1000 ${playing ? 'opacity-100' : 'opacity-0'} ${className}`} />
}
```

- [ ] **Step 2: `GameBanner.tsx`:**

```tsx
import Image from 'next/image'
import { ART } from '@/lib/game-art'
import type { Game } from '@/lib/games'
import { LoopVideo } from './LoopVideo'

/**
 * The game's own art across the top of a contest page: key art (or the publisher's loop), the character, the logo.
 * Decorative: the page says everything in text too, so it is hidden from screen readers.
 */
export function GameBanner({ game, className = '' }: { game: Game; className?: string }) {
  const a = ART[game]
  return (
    <div aria-hidden className={`relative isolate overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-white/10 ${className}`}>
      <Image src={a.art} alt="" fill fetchPriority="high" placeholder="blur" sizes="(min-width: 1320px) 1256px, 100vw" className="push-in -z-20 object-cover" />
      {a.loop && <LoopVideo src={a.loop} className="absolute inset-0 -z-20 h-full w-full object-cover" />}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#050505_0%,rgb(5_5_5/0.55)_45%,rgb(5_5_5/0)_75%),linear-gradient(0deg,#050505_0%,rgb(5_5_5/0)_45%)]" />
      {a.cutout
        ? <Image src={a.hero} alt="" sizes="(min-width: 1024px) 480px, 55vw" className="hero-in absolute right-[4%] bottom-0 h-[118%] w-auto max-w-none" />
        : <Image src={a.hero} alt="" sizes="180px" className="hero-in absolute right-[8%] bottom-[-18%] h-[120%] w-auto rotate-[8deg] rounded-[1.6rem] ring-8 ring-black/80" />}
      <Image src={a.logo} alt="" sizes="260px" className="absolute bottom-5 left-5 h-10 w-auto sm:bottom-7 sm:left-7 sm:h-14" />
    </div>
  )
}
```

- [ ] **Step 3: Motion** in `globals.css`, beside the other keyframes:

```css
/* Game art: the key art settles in slowly and the character rises into place. Off with reduced motion. */
@keyframes push-in { from { transform: scale(1.14); } }
@keyframes hero-in { from { opacity: 0; transform: translateY(10%) scale(0.95); } }
@media (prefers-reduced-motion: no-preference) {
  .push-in { animation: push-in 9s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
  .hero-in { animation: hero-in 1.1s var(--spring) 0.2s backwards; }
}
```

- [ ] **Step 4: Place it.** Details page: first child of the grid root, spanning both columns: `<GameBanner game={t.game} className="mb-8 h-56 sm:h-72 lg:col-span-2 lg:h-80" />` (move `BackLink` above it). Register page: the same banner, `h-44 sm:h-56`, above the form and above the "You're in" block.

- [ ] **Step 5: Verify.** Screenshots desktop and phone of `/games/<slug>` and `/games/<slug>/register` for all five games (signed in as the demo captain for register). Check text contrast over the art, that the character never covers the logo on phones, and that Valorant/Free Fire loops start (`--eval "document.querySelector('video')?.currentTime"` > 0).

- [ ] **Step 6: Commit.** `git commit -am "Contest pages open on their game's official art"`

---

### Task 7: Game-themed contest cards and game chips on /games

**Files:** Modify `src/components/GameCard.tsx`, `src/app/(site)/games/page.tsx`, `src/app/globals.css`.

- [ ] **Step 1: Rewrite `GameCard.tsx`:**

```tsx
import Image from 'next/image'
import type { GameView } from '@/lib/tournaments'
import { ART } from '@/lib/game-art'
import { teamLabel } from '@/lib/games'
import { Button } from './Button'
import { TeamCount } from './TeamCount'

/**
 * A contest dressed in its game: the publisher's key art behind, the character at the edge, the logo on top.
 * Hover (mouse) or keyboard focus pushes the art in and lifts the character. CSS only; nothing touches the swarm.
 */
export function GameCard({ game }: { game: GameView }) {
  const a = ART[game.game]
  return (
    <article className="game-card relative isolate flex min-h-80 overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-white/10 transition-shadow duration-500 has-focus-visible:ring-2 has-focus-visible:ring-accent sm:min-h-72">
      <Image src={a.art} alt="" fill sizes="(min-width: 896px) 896px, 100vw" className="card-art -z-20 object-cover opacity-60" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,#050505_38%,rgb(5_5_5/0.35)_100%)] sm:bg-[linear-gradient(90deg,#050505_34%,rgb(5_5_5/0.7)_62%,rgb(5_5_5/0.15))]" />
      {a.cutout && <Image src={a.hero} alt="" sizes="(min-width: 640px) 300px, 50vw" className="card-hero pointer-events-none absolute -right-4 bottom-[38%] -z-10 h-[62%] w-auto max-w-none sm:right-2 sm:bottom-0 sm:h-[112%]" />}
      <div className="flex flex-1 flex-col justify-end gap-3 p-5 sm:max-w-[62%] sm:justify-center sm:p-7">
        <div className="flex items-center gap-3">
          <Image src={a.logo} alt={game.gameName} sizes="160px" className="h-7 w-auto" />
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-text">Free</span>
        </div>
        <h3 className="display text-[1.7rem] text-text sm:text-3xl">{game.title}</h3>
        <div>
          <p className="font-medium text-text">{game.startsLabel}</p>
          <p className="text-sm text-muted">{teamLabel(game.teamSize)}{game.mode && `, ${game.mode}`}</p>
          {game.locations.length > 0 && <p className="text-sm text-muted">{game.locations.join(' · ')}</p>}
        </div>
        <TeamCount teams={game.teams} open={game.open} className="max-w-60" />
        <div className="flex gap-2">
          <Button href={`/games/${game.slug}/register`} disabled={!game.open} className="px-6">{game.open ? 'Register' : 'Closed'}</Button>
          <Button href={`/games/${game.slug}`} variant="secondary" className="px-5">Details</Button>
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Hover and focus motion** in `globals.css`:

```css
/* Contest cards: the art pushes in and the character lifts. Mouse hover and keyboard focus only; touch keeps it still. */
@media (prefers-reduced-motion: no-preference) {
  .game-card .card-art { transition: transform 1.2s var(--spring), opacity 0.6s var(--spring); }
  .game-card .card-hero { transition: transform 0.9s var(--spring); }
  .game-card:focus-within .card-art { transform: scale(1.06); opacity: 0.75; }
  .game-card:focus-within .card-hero { transform: translateY(-4%) scale(1.03); }
  @media (hover: hover) {
    .game-card:hover .card-art { transform: scale(1.06); opacity: 0.75; }
    .game-card:hover .card-hero { transform: translateY(-4%) scale(1.03); }
  }
}
```

- [ ] **Step 3: Chips** on `/games` carry the icon (from Task 5 Step 11); make the active chip `bg-accent text-ink ring-accent` and give inactive ones `bg-white/[0.04]`.

- [ ] **Step 4: Verify.** Phone and desktop screenshots of `/games` with all five contests open; one with `--eval "document.querySelector('.game-card a').focus()"` to see the focus state; `grep -rn useSceneHover src` is empty.

- [ ] **Step 5: Commit.** `git commit -am "Contest cards wear their game's art; the old hover retarget is gone"`

---

### Task 8: The home page introduces the five games

**Files:**
- Create: `src/components/GameChapter.tsx`
- Modify: `src/app/(site)/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`
- Delete: `src/components/GameList.tsx`

- [ ] **Step 1: `GameChapter.tsx`:**

```tsx
import Image from 'next/image'
import { ART } from '@/lib/game-art'
import { GAME, teamLabel, type Game } from '@/lib/games'
import { Button } from './Button'
import { LoopVideo } from './LoopVideo'
import { SceneStage } from './scene/SceneTarget'

/** One game, one screen: its art and character on one side, what it is and where to find its contests on the other. */
export function GameChapter({ game, index }: { game: Game; index: number }) {
  const g = GAME[game], a = ART[game]
  return (
    <section id={game} aria-labelledby={`${game}-name`} className="chapter grid min-h-[100dvh] scroll-mt-24 content-center gap-8 py-16 lg:grid-cols-2 lg:gap-14">
      <div className={`relative h-[52dvh] min-h-80 lg:h-[76dvh] ${index % 2 ? 'lg:order-2' : ''}`}>
        <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] ring-1 ring-white/10">
          <Image src={a.art} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="chapter-art object-cover" />
          {a.loop && <LoopVideo src={a.loop} className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-[linear-gradient(0deg,#050505_2%,rgb(5_5_5/0.2)_45%,rgb(5_5_5/0.1))]" />
        </div>
        {a.cutout
          ? <Image src={a.hero} alt="" sizes="(min-width: 1024px) 40vw, 80vw" className="chapter-hero absolute bottom-0 left-1/2 h-[108%] w-auto max-w-none -translate-x-1/2" />
          : <Image src={a.hero} alt="" sizes="260px" className="chapter-hero absolute bottom-[6%] left-1/2 h-[88%] w-auto -translate-x-1/2 rounded-[2rem] ring-[10px] ring-black" />}
      </div>
      <div className="flex flex-col items-start gap-5">
        <SceneStage shape={game} hue={null} className="h-40 w-full max-w-md sm:h-52" />
        <Image src={a.logo} alt="" sizes="280px" className="h-12 w-auto sm:h-16" />
        <p className="text-sm font-semibold text-muted">{g.platform} · {teamLabel(g.teamSize)}</p>
        <h2 id={`${game}-name`} className="display text-[clamp(2.8rem,9vw,5rem)]">{g.name}</h2>
        <p className="max-w-[40ch] text-lg leading-relaxed text-muted">{g.blurb}</p>
        <Button href={`/games?game=${game}`} variant="secondary">See {g.name} contests</Button>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Scroll-linked motion** in `globals.css`:

```css
/* Home chapters: art pushes in and the character rises as the chapter scrolls into view (scroll-driven, no JS). */
@keyframes chapter-art { from { transform: scale(1.18); } }
@keyframes chapter-hero { from { opacity: 0; transform: translateY(14%) scale(0.92); } }
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .chapter-art { animation: chapter-art linear both; animation-timeline: view(); animation-range: entry 0% cover 55%; }
    .chapter-hero { animation: chapter-hero linear both; animation-timeline: view(); animation-range: entry 15% cover 45%; }
  }
}
```

- [ ] **Step 3: Rewrite `src/app/(site)/page.tsx`** (no contest data, no cards, no Register):

```tsx
import type { CSSProperties } from 'react'
import Image from 'next/image'
import { getUser } from '@/lib/auth'
import { ART } from '@/lib/game-art'
import { GAME, GAMES } from '@/lib/games'
import { Button } from '@/components/Button'
import { GameChapter } from '@/components/GameChapter'
import { SceneStage, SceneTarget } from '@/components/scene/SceneTarget'

const STEPS = [
  ['Make an account', 'Your college ID and your NIAT registered number. Both have to match the student list.'],
  ['Pick a contest on the Games page', 'The captain types each player’s college ID. Names and numbers come from the student list.'],
  ['Get the room ID here', 'Before the match starts, the room ID and password appear on your contest page.'],
]

export default async function Home() {
  const user = await getUser()
  return (
    <div className="flex flex-col">
      <SceneTarget shape="trophy" hue={null} />

      <section className="relative flex min-h-[calc(100dvh-8rem)] flex-col justify-center gap-10">
        <SceneStage className="absolute inset-x-0 top-0 -z-10 h-[60%] lg:left-auto lg:w-1/2" />
        <div className="rise flex max-w-3xl flex-col items-start gap-6">
          <h1 style={{ '--i': 0 } as CSSProperties} className="display text-[clamp(3rem,11vw,6.5rem)]">Five games. One campus arena.</h1>
          <p style={{ '--i': 1 } as CSSProperties} className="max-w-[46ch] text-lg leading-relaxed text-muted">
            Free inter-college contests in Free Fire MAX, BGMI, COD Mobile, Valorant and Matiks. Find yours on the Games page.
          </p>
          <div style={{ '--i': 2 } as CSSProperties} className="flex flex-wrap gap-3">
            <Button href="/games">Browse contests</Button>
            {user ? <Button href="/me" variant="secondary">My games</Button> : <Button href="/signup" variant="secondary">Sign up</Button>}
          </div>
        </div>
        {/* the lineup: one character per game, each linking to its chapter below */}
        <ul className="lineup flex items-end justify-center gap-1 sm:gap-3">
          {GAMES.map((g, i) => (
            <li key={g} style={{ '--i': i } as CSSProperties} className="flex-1">
              <a href={`#${g}`} className="group flex flex-col items-center gap-3">
                <span className="relative block h-40 w-full sm:h-64 lg:h-80">
                  <Image src={ART[g].cutout ? ART[g].hero : ART[g].icon} alt="" fill sizes="(min-width: 1024px) 18vw, 20vw"
                    className="object-contain object-bottom transition-transform duration-700 ease-spring group-hover:-translate-y-2" />
                </span>
                <span className="text-center text-xs font-semibold text-muted transition-colors group-hover:text-text sm:text-sm">{GAME[g].name}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {GAMES.map((g, i) => <GameChapter key={g} game={g} index={i} />)}

      <section className="pt-16">
        <h2 className="display text-3xl sm:text-4xl">How it works</h2>
        <ol className="mt-8 flex flex-col gap-8">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-5">
              <span className="display num w-12 shrink-0 text-5xl text-accent">{i + 1}</span>
              <div>
                <h3 className="text-xl font-semibold text-text">{title}</h3>
                <p className="mt-1 max-w-[52ch] text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
```

with the lineup's entrance in `globals.css`:

```css
@media (prefers-reduced-motion: no-preference) {
  .lineup > li { animation: rise 1s var(--spring) backwards; animation-delay: calc(var(--i, 0) * 120ms + 450ms); }
}
```

`git rm src/components/GameList.tsx`.

- [ ] **Step 4: Footer and metadata** in `src/app/layout.tsx`: description `'Free inter-college esports contests in Free Fire MAX, BGMI, COD Mobile, Valorant and Matiks.'`, and a last footer line:

```tsx
        <p className="w-full text-xs leading-relaxed text-muted/70">
          Free Fire, BGMI, Call of Duty, VALORANT and Matiks are trademarks of Garena, KRAFTON, Activision, Riot Games and Matiks, whose art appears here.
          Clutch is an independent college event and is not endorsed by or affiliated with any of them. Clutch was created under Riot Games&apos; &ldquo;Legal Jibber Jabber&rdquo; policy using assets owned by Riot Games.
        </p>
```

- [ ] **Step 5: Verify** with the design skills loaded: desktop and phone screenshots of `/` at the top and at each chapter (`--scroll`), motion on. No contest card, no Register button (`curl -s localhost:3100/ | grep -c 'register'` is 0). Iterate on composition until the lineup reads at 390px and every chapter's text is legible.

- [ ] **Step 6: Commit.** `git add -A && git commit -m "Home page introduces the five games with their official art"`

---

### Task 9: Final verification and hand-off

- [ ] **Step 1:** `npx tsc --noEmit && npm run lint && npm test` all clean.
- [ ] **Step 2:** Stop the :3100 dev server, `npx next build` (clean), restart `npx next dev -p 3100` in the background.
- [ ] **Step 3:** End to end again: captain edit lands on "Changes saved"; a duplicate in-game ID inside one team and across teams shows the named error; `/forgot-password` is not found; sign-up shows "NIAT registered number".
- [ ] **Step 4:** README: the five games and their team sizes, where the art lives (`src/assets/games`, `SOURCES.md`, `public/games`), `games.ts` vs `game-art.ts` under "Where things are"; remove mentions of custom games and the glyph marks.
- [ ] **Step 5:** Update memory (stack decisions, design direction) with the five games, NIAT wording and reset removal.
- [ ] **Step 6:** Commit and hand off with the branch name and what to check.
