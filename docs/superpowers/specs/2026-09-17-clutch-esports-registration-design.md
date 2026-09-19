# Clutch: esports registration site (design spec)

Date: 2026-09-17. Status: approved in chat, awaiting spec review.

## 1. Purpose

A free-registration esports site for mobile-first Indian gamers. Visitors see the games open for registration with date, time and slots left, open a game, and register themselves or their team. An admin adds games dynamically (name, time, team size, number of slots) and manages registrations. The site is fully 3D-animated and interactive, and deploys to Vercel with MongoDB Atlas.

## 2. Decisions made with the user

| Topic | Decision |
|---|---|
| Registration format | Admin decides per game: `teamSize` (1 = solo, 4 = squad, 5 = 5v5) and `maxSlots` |
| Accounts | Email + password. Login required to register |
| Password reset | Reset link by email via Resend. No email verification step |
| Database / hosting | MongoDB (Atlas) + Vercel |
| Match info | Room ID and password shown on the site, only to logged-in players registered for that game |
| Admin access | Any account whose email is in `ADMIN_EMAILS` env var |
| Seeded games | BGMI, Free Fire MAX, Valorant, COD Mobile. Admin can add any other game |
| Visual direction | "Voltage": ink-black base, acid-lime primary, per-game accent hue, one morphing GPU particle swarm behind the whole site |
| When full | Button shows "Full", registration closes. No waitlist |

Rejected earlier and must not return: literal weapon models, the matte silver theme, the "Glacier" petrol/aqua arena-ring direction, ghost-styled cards with one vague action.

## 3. Stack

- Next.js (latest, App Router, TypeScript, `src/` dir), Tailwind CSS v4.
- Plain `three` driven from one client component. **No React Three Fiber or drei:** R3F 9.7 requires `react < 19.3` and Next 16 ships React 19.3, and the scene is a single `THREE.Points` object, so a reconciler adds nothing. No postprocessing: additive soft points glow on a dark base without bloom. Add bloom only if screenshots show it is needed.
- `mongodb` official driver. No Mongoose. `zod` validates every server action input.
- `better-auth` with its MongoDB adapter: email + password, sessions, reset tokens, built-in rate limiting on auth endpoints. Chosen over hand-rolled auth because password hashing, session and reset-token code is a trust boundary.
- `resend` for the reset email. In dev without `RESEND_API_KEY`, the reset URL is logged to the server console instead.
- Mutations are Server Actions. The only route handlers are better-auth's catch-all and the CSV export.
- No state library, no animation library, no date library, no CSV library, no markdown library. Use React context + `useSyncExternalStore`, CSS animations, `Intl.DateTimeFormat`, and hand-written CSV.

## 4. Data model

### `tournaments`

```
_id, slug (unique), game: 'bgmi'|'freefire'|'valorant'|'codm'|'custom',
gameName: string          // "BGMI"; typed by admin when game = custom
title: string             // "Friday Night Scrims"
mode: string              // "Squad TPP, Erangel" (free text, optional)
glyph: 'drop'|'flame'|'spike'|'rank'|'crest'
hue: number 0..360        // accent = oklch(0.78 0.17 hue); preset prefills, admin can change
startsAt: Date (UTC), regClosesAt: Date (UTC, defaults to startsAt)
teamSize: int 1..10, maxSlots: int 1..1000, slotsTaken: int
rules: string             // plain text, rendered with whitespace preserved
prize: string             // optional free text
status: 'draft'|'open'|'closed'|'completed'
room: { id, password, note, publishedAt } | null
createdAt, updatedAt
```

Registration is open iff `status === 'open' && now < regClosesAt && slotsTaken < maxSlots`.

Edit rules: `maxSlots` cannot go below `slotsTaken`. `teamSize` cannot change once any confirmed registration exists. Deleting a tournament is allowed only when it has no confirmed registrations; otherwise set it to `closed`.

### `registrations`

```
_id, tournamentId, userId, code: 'CL-XXXXXX',
teamName: string | null   // required when teamSize > 1
players: [{ name, inGameId }]   // length === teamSize; index 0 is the captain
phone, email: string     // copied from the user at registration time, so the admin table and CSV need no join
status: 'confirmed'|'cancelled', createdAt
```

Indexes: unique partial on `(tournamentId, userId)` where `status = 'confirmed'` (so cancel then re-register works); `(tournamentId, createdAt)`; `tournaments.slug` unique.

One in-game ID field per player, with a per-game placeholder (BGMI: character ID, Valorant: `Name#TAG`).

### Users

Managed by better-auth. One additional required field: `phone` (WhatsApp number so the organiser can reach the captain). It is collected only, never verified: no OTP, no SMS. The only check is a loose shape check (10 to 13 digits after stripping spaces, `+` and dashes) so typos get caught.

### Slot claim (the one piece of real logic)

1. Validate input with zod (`players.length === teamSize`).
2. `findOneAndUpdate` on the tournament with filter `status: 'open'`, `regClosesAt > now`, `$expr: slotsTaken < maxSlots`, update `$inc: { slotsTaken: 1 }`. No match means closed or full.
3. Insert the registration. On duplicate key (already registered) or any other error, `$inc: { slotsTaken: -1 }` and return the error.

No transactions needed, so it works on standalone local Mongo and on Atlas. Known ceiling: a crash between steps 2 and 3 leaks one slot. The admin game page has a **Recount slots** button that sets `slotsTaken` to the real confirmed count. It is a button, not an on-load repair, because recounting while a claim is between steps 2 and 3 would undercount.

Cancel: atomically flip the registration `confirmed -> cancelled`; only if that modified a document, `$inc: { slotsTaken: -1 }`. Allowed until `regClosesAt`.

### Time

Stored in UTC. Admin enters `datetime-local` values interpreted as IST (fixed `+05:30`, India has no DST). Displayed with `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })` and labelled IST.

## 5. Pages

| Route | Purpose |
|---|---|
| `/` | Swarm hero, short pitch, list of open games as cards (game, title, date + time IST, team size, slot meter, "Free"), two actions per card pinned to the bottom: **Register** (solid) and **Details**. Lists tournaments with `status = 'open'` and `startsAt` in the future, soonest first; full ones stay listed with a disabled "Full" button. Draft, closed and completed ones are hidden |
| `/games/[slug]` | The game's colour world. Rules, mode, prize, schedule, live countdown, slot meter, Register CTA (or "Full" / "Closed" / "You're in"). Room panel appears only for a logged-in confirmed registrant once published; rendered server-side only |
| `/games/[slug]/register` | Login required (redirect to `/login?next=`). Solo: in-game ID. Team: team name + `teamSize` player rows, captain row prefilled from the account. Success state: swarm burst, registration code, link to `/me` |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | better-auth flows. Signup asks name, email, phone, password |
| `/me` | My registrations: game, time, team, code, room details when published, cancel button until registration closes |
| `/admin` | Guarded. Games table with status, slots, quick open/close |
| `/admin/games/new`, `/admin/games/[id]` | Create/edit form (preset picker prefills gameName, glyph, hue, teamSize). Room ID/password publish form. Registrations table with team, players, in-game IDs, phone, email. Remove a registration. CSV export |
| `not-found`, `error`, `loading` | Styled states |

Admin guard: `isAdmin(user)` requires the lowercased email to be in `ADMIN_EMAILS` **and** `user.emailVerified === true`. Without the second condition anyone could sign up with the owner's address first and become admin, because players are never forced to verify. A verification email is sent on every signup (players can ignore it); an unverified admin-listed account sees a "verify your email to unlock admin" notice with a resend button. It is enforced in the admin layout **and** inside every admin server action and the export route, never only in routing.

CSV export escapes quotes and prefixes cells starting with `= + - @` with `'` to block spreadsheet formula injection.

Freshness: mutations call `revalidatePath`. The home and game pages also `router.refresh()` every 20 s while the tab is visible so slot counts move without a reload. Ceiling: polling; upgrade to SSE if it ever matters.

## 6. Visual system: "Voltage"

Tokens (OKLCH, defined once as CSS custom properties):

```
--ink:      oklch(0.14 0.02 285)   page base
--surface:  oklch(0.19 0.025 285)  cards, panels
--line:     oklch(0.30 0.03 285)
--text:     oklch(0.96 0.01 110)
--muted:    oklch(0.72 0.02 285)
--volt:     oklch(0.93 0.22 125)   primary; text on it is --ink
--danger:   oklch(0.65 0.22 25)
--accent:   oklch(0.78 0.17 var(--hue))   set per game via --hue
```

Preset hues: BGMI 80 (amber), Free Fire MAX 45 (orange), Valorant 15 (crimson), COD Mobile 210 (steel cyan), custom 300 by default. Hub pages use `--volt` as the accent.

Type: Archivo (variable, expanded width, heavy) for display, Geist for body, Geist Mono for numbers (slots, countdown, codes), all via `next/font`.

Copy rules from the user: no em-dashes in visible copy, no tracked all-caps eyebrow above every section, no arrow glyphs on links, no single accented headline word. Primary buttons are solid `--volt` with `--ink` text. Minimum 44 px touch targets. Visible focus rings.

Before building UI, load the design skills the user asked for (`design-taste-frontend`, `high-end-visual-design`, `frontend-design`) and the `threejs-3d-web` skill.

## 7. 3D: the swarm

One `<canvas>` mounted once in the root layout, fixed behind the content, `aria-hidden`, never remounted on navigation. `three` is loaded with a dynamic `import()` inside `useEffect` so it stays off the critical path. It renders a single `THREE.Points` (one draw call) with a custom shader.

**Shapes** (point clouds, generated once and cached):

| Shape | Source | Shown when |
|---|---|---|
| `trophy` | Surface-sampled `LatheGeometry`, true 3D, slowly rotating | Home hero |
| `drop`, `flame`, `spike`, `rank`, `crest` | SVG path drawn to an offscreen 2D canvas, points sampled where alpha > 0, given shallow depth | Game card in focus, game page. Abstract marks, **not** official game logos |
| `slots` | Computed ring of `maxSlots` segments: taken segments dense and bright, free segments sparse. Above 64 slots it becomes a continuous arc gauge | Game page slot section, register page |
| `check` | Canvas-sampled tick | Registration success, after a radial burst |
| `field` | Loose drifting cloud | Auth, `/me`, admin (calm background) |

The same SVG path data renders the DOM icon on cards, so glyphs are defined once.

**Morphing:** attributes `aFrom`, `aTo`, `aSeed`; uniforms `uProgress`, `uTime`, `uPointer`, `uColor`. On a target change the current interpolated positions are baked into `aFrom` (so interrupting a morph never pops), `aTo` is replaced, and `uProgress` eases 0 to 1 with per-particle stagger and noise displacement peaking mid-flight. Colour lerps to the target accent.

**Interaction:** particles are pushed away from the pointer / touch point (ray hit on a plane, done in the vertex shader). Scroll position adds camera parallax. On desktop, hovering a game card morphs the swarm to that game's glyph and hue; on touch devices the card nearest the viewport centre does it (IntersectionObserver). Registering fires burst then `check`.

**Control surface:** a tiny scene store (`setTarget({ shape, hue, slots? })`) exposed by context. Pages declare their target with a `<SceneTarget />` client component; cards call it on hover/focus.

**Performance budget:** 40k points desktop, 12k on coarse-pointer / small screens; DPR capped at 2 desktop and 1.5 mobile; if the first ~90 frames average over 24 ms the draw range is halved (point order is random, so any prefix is a uniform subsample); render loop pauses when the tab is hidden. `prefers-reduced-motion`: shapes snap without flight, no pointer push, no rotation. If WebGL is unavailable the site works fully with a CSS gradient background.

**Other interactivity (DOM):** card tilt on pointer devices and press-scale on touch, live countdowns, animated slot meters, page enter transitions (`app/template.tsx` remounts per navigation and replays a CSS animation), player rows that reveal in sequence on the register form, inline validation.

## 8. Project layout

```
src/app/(site)/            page.tsx, games/[slug]/page.tsx, games/[slug]/register/page.tsx, me/page.tsx
src/app/(auth)/            login, signup, forgot-password, reset-password
src/app/admin/             layout.tsx (guard), page.tsx, games/new, games/[id], games/[id]/export/route.ts
src/app/api/auth/[...all]/route.ts
src/lib/                   db.ts, auth.ts, auth-client.ts, admin.ts, tournaments.ts (queries, claimSlot, cancel, save),
                           schemas.ts (zod), time.ts, csv.ts, games.ts (presets + glyph paths)
src/components/scene/      SceneCanvas.tsx, swarm.ts, shapes.ts, scene-store.ts, SceneTarget.tsx (SceneTarget + SceneZone)
src/components/            GameCard, SlotMeter, Countdown, forms, nav
scripts/seed.ts            four sample tournaments with future dates
scripts/shots.mjs          headless Chrome (CDP) screenshots at 1440x900 and 390x844
test/claim.test.ts         node:test against local Mongo
```

Env (`.env.example` committed): `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`.

Local dev database: `podman run -d -p 27017:27017 docker.io/library/mongo:8`.

## 9. Error handling

- Every server action returns a typed `{ ok: true, ... } | { ok: false, error }`; forms show the error inline and keep the user's input.
- Register errors are specific: not logged in, closed, full, already registered, invalid roster.
- Mongo client is cached on `globalThis` so Vercel lambdas and dev HMR do not exhaust connections.
- Missing env vars fail fast at startup with the variable's name.

## 10. Testing and verification

- `test/claim.test.ts` (`node --test`): with `maxSlots = 3`, fire 10 concurrent claims from 10 users and assert exactly 3 succeed and `slotsTaken === 3`; a second claim by the same user fails and does not leak a slot; cancel frees the slot.
- Unit checks for IST conversion and CSV escaping in the same run.
- Visual: `scripts/shots.mjs` captures every page at desktop and phone width with reduced-motion emulation turned off. No page is called done without looking at both.
- End of work: `npm run build` passes, `npm run dev` is left running and confirmed serving.

## 11. Out of scope for v1

Payments, brackets, results and leaderboards, waitlist, email verification, team-invite links (the captain enters the whole roster), image uploads (glyph + colour is the art), in-panel admin management, notifications beyond the reset email, multiple languages.

## 12. What changed during the build

- **Stages replaced fixed anchors.** The swarm is positioned by `<SceneStage />` elements in the page layout (sticky right column on desktop, a block above the content on phones) instead of hard-coded offsets. Phones get a swipe carousel of games under a stage, so the focused card becomes the swarm.
- **Primary buttons use the page accent**, which is `--volt` on hub pages and the game's hue inside a game's colour world, rather than `--volt` everywhere.
- **No scroll parallax and no scroll listener.** The frame loop reads the active stage's box, which already tracks scrolling.
- **Reduced motion keeps the frame loop** with motion at zero and values snapped, so the swarm still stays attached to its stage while scrolling.
- **Tailwind sources are explicit** (`source(none)` + `@source`) because Turbopack never invalidated CSS for files inside bracketed route folders.
- React is 19.2.8 as pinned by create-next-app, so R3F would have installed; plain three.js was kept because the scene is one `THREE.Points` object.
- A full or closed game's `/register` page and `/admin` for outsiders answer HTTP 200 with the redirect or not-found page in the body, because `loading.tsx` starts streaming before the check runs. No protected content is rendered either way.

