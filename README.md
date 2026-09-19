# Clutch

Free-entry inter-college contests in five games: Free Fire MAX and BGMI (squads of 4), COD Mobile and Valorant (teams of 5) and Matiks (solo). The game sets the team size; nobody can change it. An admin loads the colleges and the student roster; a student signs up only if their NIAT ID and NIAT registered number are both on it. Contests are opened to a set of colleges, and only those students see them. A captain registers a team by typing NIAT IDs (names and numbers come from the roster), and everyone on a team must be from the captain's own college. There is no slot cap: any number of teams may enter. Every teammate sees the team on their own account. Admins run it all from `/admin`. A three.js particle swarm sits behind every page and takes the shape of whatever you are looking at.

Next.js 16 (App Router), Tailwind 4, plain three.js, MongoDB, better-auth.

## How the pieces fit

```
colleges (branches)   name + location, uploaded once. Everything else points at this.
      ↓
students              collegeId, name, phone, college. The sign-up gate and the player lookup.
      ↓
contests              opened to a set of colleges; only their students see or enter it.
      ↓
teams                 captain + players, all from one college. College and location are derived.
```

Three rules hold the model together, and each has a test:

1. **A person is identified by NIAT ID, never by account.** A teammate who never filled a form still sees the team, because membership is matched on their roster ID.
2. **A team is single-college by construction.** Its college is the captain's roster row, so admin filters by college and location cannot be wrong.
3. **One person, one team per contest.** Enforced by a unique index on `(tournamentId, players.collegeId)`, so two captains racing for the same player cannot both win.
4. **One in-game ID, one player per contest.** Nobody can enter an in-game ID that another player in the same contest already uses, on their own team or any other, whatever the letter case. Checked in `findClash`, which captain registration, captain edits and admin edits all go through.

## Run it locally

```bash
podman run -d --name clutch-mongo -p 27017:27017 docker.io/library/mongo:8   # first time
podman start clutch-mongo                                                     # after a reboot
cp .env.example .env.local      # then fill BETTER_AUTH_SECRET:  openssl rand -base64 32
npm install
npm run seed                    # 3 colleges, 48 students, 5 contests   (-- --reset wipes them)
npm run dev                     # http://localhost:3000
npm test                        # team rules, college scoping, role guards, roster import, IST time, CSV, redirect guard
```

Use `127.0.0.1` in `MONGODB_URI`, not `localhost`. On Fedora `localhost` is IPv6 and rootless podman resets those connections.

## The student list

Nobody can sign up unless their **NIAT ID and NIAT registered number are both on one row** of the `students` collection. Admins load it at `/admin/students`, either by importing a CSV whose first row names the columns `collegeId, name, phone, branch` (any order, up to 5000 rows) or by adding people one at a time. Re-importing a corrected sheet updates rows rather than duplicating them, because everything upserts on NIAT ID.

Both sides normalise before they compare: `+91 98765 43210` and `9876543210` are the same number, `2203a51234` and `2203A51234` the same ID. A student's `branch` is copied from their roster row at sign-up and cannot be typed by hand. One NIAT ID gets one account.

If someone's number has changed since the sheet was made, edit their row at `/admin/students` — that is the intended fix, so the mobile match stays meaningful.

## Becoming admin

**The first account ever created is the admin.** On a fresh database the student list is empty, and the student list is what every sign-up is checked against — so nobody could get in to load it. Instead, the very first sign-up skips that check and gets the admin role. Every sign-up after it must match the roster, and is a plain user.

So after pointing the site at a new database, **sign up straight away**, then open `/admin` → **Admins** and check you are the only one listed. Whoever signs up first gets the role; if it was not you, remove them there. That first account has no college, so it runs the panel but cannot register for a contest.

After that, `/admin` → **Admins** promotes anyone else who already has an account. `npm run promote you@example.com` (add `-- --revoke` to take it back) does the same from a terminal. The role is a field on the user document, never anything the sign-up form can set, and nobody can change their own role, so the last admin cannot lock themselves out. Everyone else sees a 404 at `/admin`.

## Going live (Vercel + MongoDB Atlas)

| Variable | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string ending in `/clutch`. In Atlas, Network Access must allow `0.0.0.0/0` (Vercel has no fixed IPs) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | The production URL, no trailing slash |

Indexes are created on first use. Load the colleges and the student roster at `/admin/colleges` and `/admin/students` before anyone can sign up.

**Never seed production.** `npm run seed` writes 3 invented colleges and 48 invented students, and `-- --reset` deletes every contest, team, college and student. It is a local command: it needs `.env.local`, which Vercel does not have. It also refuses to run when `MONGODB_URI` is not a local database unless you add `-- --yes-really`, and it skips entirely if any colleges, students or contests already exist.

## Where things are

- `src/lib/tournaments.ts` holds every contest and team rule: the roster lookup, the single-college check, the one-team-per-person index, captain edits, admin edits. No Next imports, so `node --test` runs it directly.
- `src/lib/students.ts` and `src/lib/branches.ts` are the roster and the college list, both with CSV import. `src/lib/users.ts` has the role.
- `src/components/scene/` is the swarm. `<SceneStage />` is an empty box the swarm flies into, so CSS decides where the 3D sits at each breakpoint. `<SceneTarget />` sets a page's shape and colour.
- `src/lib/games.ts` is the five games: name, team size, in-game ID hint. It has no imports, so tests and the swarm can load it. Contests saved for any other game stay in the database but players never see them.
- `src/lib/game-art.ts` imports each game's official art from `src/assets/games/<game>/` (every file's source is in `src/assets/games/SOURCES.md`). `public/games/<game>/mask.png` is the logo the swarm draws, and Valorant and Free Fire MAX have a `loop.mp4`.
- `scripts/shots.mjs` takes headless Chrome screenshots: `node scripts/shots.mjs /@home --only phone`. It skips the first-visit loader unless you pass `--intro`.
- The first-visit loader is `src/components/IntroLoader.tsx`. A script in `<head>` shows it once per browser session (sessionStorage), and it holds the page's entrance animations until it lifts.
- Logged out, `/games`, every contest page and every register page show a "Log in to see contests and register" screen (`LoginGate`) instead of redirecting. The home page is public.

## Known ceilings

- Team counts refresh by polling every 20 s, not push.
- A contest another college cannot enter serves the not-found page, but with HTTP 200 rather than 404. The content is hidden; only the status code is a soft 404, and the same is true of `/admin` for non-admins. That is how `notFound()` behaves in a dynamic route here.
- Mobile numbers and NIAT IDs are never verified against the student themselves, only against the roster. Someone who knows a classmate's NIAT ID can put them on a team; the teammate sees it in My games and asks the captain to change it.
- No payments, brackets, results or image uploads.
- No self-service password reset, and the site sends no email. A player who forgets their password emails the organisers (the address is `ORGANISERS_EMAIL` in `src/app/(auth)/AuthForm.tsx`, a placeholder until they pick one), and an admin sets a new one under Admin, Admins and passwords. That signs the player out everywhere. Players change their own password from My games.
