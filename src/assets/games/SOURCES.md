# Game art sources

Every image and clip here is the publisher's own material, downloaded 2026-09-18 from their official sites,
press kits or store listings. The games' names, logos and characters belong to their owners; Clutch uses them
only to show which game a contest is for, and the site footer says so. Nothing here is AI-generated or redrawn.

"Cut out by us" means we removed the background locally (rembg, isnet-general-use) and cleaned the edges by hand.
Everything was resized and re-encoded to WebP (loops to H.264 MP4); nothing else was changed.

| File | What | Source | Owner |
| --- | --- | --- | --- |
| `freefire/logo.webp` | Free Fire MAX logo | ff.garena.com/en/brand/ (brand kit) | Garena |
| `freefire/icon.webp` | the F emblem from the brand kit, on carbon | ff.garena.com/en/brand/ | Garena |
| `freefire/art.webp` | key art | cdn.wildflamestudio.com/common/web_event/official2.ff.garena.all/img/20228/65fef1213324415a00e170bef3a51e2b.jpg (ff.garena.com) | Garena |
| `freefire/hero.webp` | characters render, already transparent | cdn.wildflamestudio.com/common/web_event/official2.ff.garena.all/202311/a393f95f57bdaa3d2031a052b6acef24.png (ff.garena.com/en/chars/) | Garena |
| `public/games/freefire/loop.mp4` | 3.3 s of the skydive from the site trailer | cdn.wildflamestudio.com/common/test/official/e68883609a0e69a03cc586852ff77dd7.mp4 (ff.garena.com) | Garena |
| `bgmi/logo.webp` | BGMI logo | battlegroundsmobileindia.com | Krafton |
| `bgmi/icon.webp` | app icon | Google Play listing (com.pubg.imobile) | Krafton |
| `bgmi/art.webp` | store screenshot, cropped | App Store listing (is1-ssl.mzstatic.com) | Krafton |
| `bgmi/hero.webp` | soldier from a store screenshot, **cut out by us**. Small source, so it is only 343x465: keep it small on screen | App Store listing (is1-ssl.mzstatic.com) | Krafton |
| `codm/logo.webp` | Call of Duty: Mobile logo | callofduty.com/mobile | Activision |
| `codm/icon.webp` | app icon | Google Play listing (com.activision.callofduty.shooter) | Activision |
| `codm/art.webp` | media gallery image 1, cropped | callofduty.com/mobile (CODM_Media-Gallery_IMG-1) | Activision |
| `codm/hero.webp` | Urban Tracker operator, **cut out by us** | callofduty.com/mobile (IC_UrbanTracker) | Activision |
| `valorant/logo.webp`, `icon.webp`, `art.webp` | logo, V mark, closed beta key art | Riot's VALORANT asset kit, playvalorant.com/en-us/news/game-updates/valorant-asset-kit/ | Riot Games |
| `valorant/hero.webp` | Phoenix, **cut out by us** from the agent masthead | cmsassets.rgpub.io/sanity/images/dsfx7636/game_data/ecdb26df5c69c4a1adcae5cf5ec31e7b0e252e66-5120x1772.png (playvalorant.com) | Riot Games |
| `public/games/valorant/loop.mp4` | a few seconds of a playvalorant.com video | cmsassets.rgpub.io (playvalorant.com/en-us/media/) | Riot Games |
| `matiks/icon.webp` | app icon | matiks.in/icon.png | Matiks |
| `matiks/logo.webp` | the mark and wordmark, keyed from store screenshot 1 | Google Play listing (play-lh.googleusercontent.com) | Matiks |
| `matiks/art.webp` | store screenshot 9 | Google Play listing | Matiks |
| `matiks/hero.webp` | the duel screen's phone from store screenshot 3, masked to the handset by us | Google Play listing | Matiks |

`public/games/<game>/mask.png` are silhouettes of each logo's mark (white on transparent). The particle swarm on the
home page and contest pages forms these shapes. They are traced from the logos above, so the same owners apply.

The script that built these from the downloads is not kept in the repo; the downloads were too large to commit.
To replace a file, keep its name and rough proportions (WebP, `art` about 16:9, `hero` a transparent cutout).
