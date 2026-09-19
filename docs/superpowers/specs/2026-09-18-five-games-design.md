# Five games, game art, registration fixes (design spec)

Date: 2026-09-18. Source: the user's eight-point plan (`~/Downloads/plan .txt`), answers given in chat the same day.

## 1. Decisions made with the user

| Question | Answer |
|---|---|
| Which five games | Free Fire MAX (4), BGMI (4), COD Mobile (5), Valorant (5), Matiks (solo). "Matkis" in the plan is Matiks, the 1v1 math-duel app. |
| What the game animations are made of | Official art plus motion: logos, key art and character cutouts from each publisher's own site or press kit, animated with scroll parallax and reveals. A video loop only where the publisher offers the file (Valorant, Free Fire). The red particle swarm forms each game's logo. |
| How far "no two people share an in-game ID" reaches | Per contest, case-insensitive. The same student may reuse their own ID in another contest. |
| Game art vs the black/white/red brand | Art stays full colour, exactly as the publisher made it. Buttons, text and panels stay black, white and red. |
| Contest card hover | The old hover (the swarm morphing into the card's abstract mark, plus the pointer spotlight) goes. Cards carry their game's art and animate that instead. |
| Home page | An introduction to the five games. No contest cards and no Register buttons. Each game's section has one link to the Games page filtered to that game. |

## 2. The game catalog

`src/lib/games.ts` becomes the one list of games, in this order:

| Key | Name | Team size | In-game ID hint |
|---|---|---|---|
| `freefire` | Free Fire MAX | 4 | Player UID, e.g. 1234567890 |
| `bgmi` | BGMI | 4 | Character ID, e.g. 5123456789 |
| `codm` | COD Mobile | 5 | Player UID |
| `valorant` | Valorant | 5 | Riot ID, e.g. Name#TAG |
| `matiks` | Matiks | 1 | Matiks username |

It stays free of image imports so `node --test` can load it. Art lives in a separate `src/lib/game-art.ts` that statically imports the images (so next/image gets sizes and blur placeholders).

**Team size is set by the game, on the server.** `tournamentInput` drops `gameName`, `teamSize`, `glyph` and `hue`. `saveTournament` writes `gameName` and `teamSize` from the catalog, so a forged form cannot give BGMI five players. Once a contest has teams, its game (and so its team size) is locked, with one message: "The game is locked once teams have registered."

`glyph` and `hue` leave the `Tournament` type. Old documents keep the fields; nothing reads them.

**Retired games.** A stored contest whose `game` is not one of the five (the seeded "Code Sprint") is hidden from players: `listOpen` and `listMine` filter to the five, and the details and register pages treat it as not found. Admin still lists it, with its stored name and a plain placeholder icon, and the manage page says the game is no longer offered.

## 3. Admin contest form

- Game: a dropdown with exactly the five games.
- Under it, read-only: the game's logo and "Squad of 4" (or "Team of 5", "Solo"), "set by the game".
- Removed: game name, players per team, mark picker, colour slider, and the 3D preview of the mark.
- Unchanged: title, mode, start and close times, colleges, the in-game ID toggle, rules, prize, status.

## 4. Registration

### 4.1 Captain edit (bug)

Reproduced in headless Chrome with the demo captain: the save works and the database updates, but the page stays on "Edit your team" and the form only has room for errors, so nothing visible happens. Fix: after a successful edit, `registerAction` redirects to `/games/<slug>/register?saved=1`, which renders the team confirmation with a "Changes saved." status line. A new registration keeps its current behaviour.

### 4.2 In-game IDs are unique per contest

Compared trimmed and case-insensitively (ICU strength 2, the same rule in the query collation and in JS):

- Two players on one team with the same ID: refused. "Two players have the same in-game ID (X). Every player needs their own."
- An ID already used by a player on another confirmed team in the same contest: refused, naming them. "In-game ID X is already used by Priya Menon on KKH Falcons in this contest."
- Re-saving your own team with the same IDs, or reusing your ID in a different contest: allowed.

The same checks run for captain registration, captain edits and admin edits, because they all go through `buildRoster` and `findClash`.

`ponytail:` no unique index backs this. Two captains typing the same in-game ID for two different students in the same instant could both get in. The college-ID index still stops the same person being on two teams. Add a partial unique index with a case-insensitive collation if that ever happens.

### 4.3 Sign-up label

"WhatsApp number" becomes "NIAT registered number" on the sign-up form, with the hint "The mobile number NIAT has on file for your college ID." The sign-up gate's messages use the same words. Admin screens are unchanged.

## 5. Password reset is removed

Deleted: the forgot-password and reset-password pages, the reset link on the login form, `sendResetPassword` in `auth.ts`, `src/lib/mail.ts`, and the Resend variables in `.env.example` and the README. A wrong password says "Wrong password. Try again." With no `sendResetPassword`, better-auth refuses its own reset endpoint too, so no email can be sent by any route. Resetting comes back later with a different approach.

## 6. Game art

### 6.1 Assets

Only from the publishers' own sites or press kits:

| Game | Source |
|---|---|
| Valorant | Riot's VALORANT Asset Kit (logos, agent art, two video clips) |
| Free Fire MAX | ff.garena.com brand and characters pages (logos, character cutouts, promo video) |
| BGMI | battlegroundsmobileindia.com and krafton.in (logo, key art) |
| COD Mobile | callofduty.com/mobile (logo, key art) |
| Matiks | matiks.in and its Play Store listing (logo, app screenshots) |

Per game: `icon` (square), `logo` (wordmark on transparent), `art` (wide key art), `hero` (character cutout on transparent; Matiks gets an app screenshot in a phone frame instead), all WebP in `src/assets/games/<key>/`. `public/games/<key>/mask.png` is the logo's silhouette for the particle swarm. Valorant and Free Fire get `public/games/<key>/loop.mp4`: a few seconds, muted, 720p or less, about 2 MB at most. `src/assets/games/SOURCES.md` lists the source URL of every file.

The footer gets a trademark line naming the five publishers and saying Clutch is not endorsed by them (Riot's fan-content wording included).

### 6.2 Where it shows

- **Home:** no contest data. A hero with the five games lined up (one character each, Matiks as its phone screen), animating in one after another. Then one full-screen section per game: key art with a slow push-in, the character moving in with scroll, the logo, the format, one line about the game, and a "See <game> contests" link to `/games?game=<key>`. The swarm forms that game's logo in each section. Then "How it works". No cards, no Register buttons.
- **Games page:** the list of contest cards stays. Filter chips are the five games, keyed by `?game=<key>`. Each card shows its game's key art behind the content and the character at one edge. On hover or keyboard focus the art pushes in and the character lifts. No swarm retarget, no pointer spotlight.
- **Details and Register pages:** a banner in the game's art above the existing content: key art (the video loop instead, for Valorant and Free Fire, when it can play), the character, the logo. The swarm forms the game's logo in the page's stage. The "You're in" burst stays.
- **Small spots** (admin list, My games, card headers, chips) use the official square icon in place of the old abstract marks.

### 6.3 Motion and weight

- `prefers-reduced-motion: reduce`: no push-in, no parallax, no video (the poster shows).
- Video plays only while it is on screen and never when the browser asks to save data.
- Scroll-linked movement uses CSS scroll-driven animations where the browser has them, and simply does not move elsewhere.
- Images go through next/image with real `sizes`, so phones fetch small files. Only above-the-fold art is `priority`.

### 6.4 Swarm

Game shapes come from `mask.png`: the swarm loads the five masks once, samples their alpha the way it already samples SVG paths, and keeps the current shape until a mask has loaded. `Shape` becomes `'trophy' | 'field' | 'teams' | 'check' | Game`. The abstract marks (`drop`, `flame`, `spike`, `rank`, `crest`) and `GlyphIcon` are deleted; `check` stays for the burst. `useSceneHover` and `GameList` are deleted; nothing uses them after this change.

## 7. Data

`npm run seed` creates one contest per game. The existing dev database is not wiped: new contests for the missing games are created through the admin form during verification.

## 8. Testing

- Node tests: duplicate in-game ID inside one team; an ID taken on another team in the same contest, different case; the same ID in a different contest and on your own re-save; team size follows the game whatever the form says; the game lock once teams exist. Existing tests move to the new input shape and messages.
- Headless Chrome, desktop 1440x900 and phone 390x844, motion on: home, games, details, register, admin contest form. End to end: captain edit lands on "Changes saved"; a duplicate in-game ID shows its error; the admin form saves a contest with the game's team size.
- `npm run lint`, `npm test`, `next build` clean. Dev server left running.
