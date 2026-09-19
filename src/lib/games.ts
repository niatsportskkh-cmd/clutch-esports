export const GAMES = ['freefire', 'bgmi', 'codm', 'valorant', 'matiks'] as const
export type Game = (typeof GAMES)[number]

/**
 * The five games, and the only place their rules live. Team size belongs to the game, not the contest:
 * saveTournament copies it from here, so no form can put five players in a BGMI squad.
 * No imports at all: node --test loads this file, and so does the swarm's lazy bundle. The art is in game-art.ts.
 */
export const GAME: Record<Game, { name: string; teamSize: number; idHint: string; platform: 'Mobile' | 'PC'; blurb: string; publisher: string; about: string }> = {
  freefire: { name: 'Free Fire MAX', teamSize: 4, idHint: 'Player UID, e.g. 1234567890', platform: 'Mobile', blurb: 'Ten-minute battle royale. Fifty players land, and one squad is left standing.',
    publisher: 'Garena', about: 'The high-detail edition of Garena’s Free Fire, on Android and iOS. Your squad drops in, grabs gear fast and fights its way inward as the safe zone shrinks.' },
  bgmi:     { name: 'BGMI',          teamSize: 4, idHint: 'Character ID, e.g. 5123456789', platform: 'Mobile', blurb: 'A hundred players drop onto one island. The last squad alive takes it.',
    publisher: 'KRAFTON', about: 'Battlegrounds Mobile India, KRAFTON’s battle royale made for India, on Android and iOS. Parachute in, scavenge weapons and armour, and outlast every other squad on the map.' },
  codm:     { name: 'COD Mobile',    teamSize: 5, idHint: 'Player UID, e.g. 6749128374650192837', platform: 'Mobile', blurb: 'Five on five on classic Call of Duty maps, settled round by round.',
    publisher: 'Activision', about: 'Call of Duty multiplayer made for phones, on Android and iOS. Competitive play is five against five in modes like Hardpoint, Search & Destroy and Control.' },
  valorant: { name: 'Valorant',      teamSize: 5, idHint: 'Riot ID, e.g. Name#TAG', platform: 'PC', blurb: 'Tactical five on five. Plant the Spike or stop it, one round at a time.',
    publisher: 'Riot Games', about: 'Riot Games’ tactical shooter for PC. One side plants the Spike, the other defends, and every agent brings abilities that can swing a round. First to 13 rounds wins; at 12–12 it goes to overtime, won by two.' },
  matiks:   { name: 'Matiks',        teamSize: 1, idHint: 'Matiks username', platform: 'Mobile', blurb: 'Head to head mental maths. Out-calculate the player across from you.',
    publisher: 'Matiks', about: 'Mental arithmetic as a live one-on-one duel, on Android and iOS. Both players get the same problems at the same time, and the faster correct answers take the match.' },
}

/** Contests saved before the five (a "Code Sprint") are still in the database. Players never see them. */
/** Games whose registration is run by a partner site: every Register button, and the register page itself, go there. */
export const EXTERNAL_REGISTER: Partial<Record<Game, string>> = { freefire: 'https://www.agentesports.in/niat/clutch-2026' }

export const isGame = (g: string): g is Game => Object.hasOwn(GAME, g)

export const teamLabel = (n: number) => (n === 1 ? 'Solo' : n === 2 ? 'Duo' : n === 4 ? 'Squad of 4' : `Team of ${n}`)
