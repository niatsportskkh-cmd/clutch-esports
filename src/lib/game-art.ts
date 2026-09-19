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
 * transparent background; otherwise it is a picture the layout frames itself (Matiks: a phone screen).
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
