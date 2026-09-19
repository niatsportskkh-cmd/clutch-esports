import { z } from 'zod'
import { GAMES } from './games.ts'

export const STATUSES = ['draft', 'open', 'closed', 'completed'] as const
export const ROLES = ['user', 'admin'] as const
export type Status = (typeof STATUSES)[number]
export type Role = (typeof ROLES)[number]

const text = (max: number) => z.string().trim().max(max)
const istLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Pick a date and time')

// collected, never verified (no OTP): shape check only. Both the roster and sign-up run every
// number through this, so "98765 43210" and "+919876543210" cannot miss each other at the gate.
export const phoneSchema = z.string()
  .transform(s => s.replace(/[\s+\-()]/g, '').replace(/^91(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^\d{10,13}$/, 'Enter a valid phone number'))

// Same idea for college IDs: one spelling in the roster and at the gate, whatever case they type.
export const collegeIdSchema = z.string().trim().toUpperCase()
  .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9/-]{2,23}$/, 'Enter a valid NIAT ID'))

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
export type TournamentInput = z.infer<typeof tournamentInput>

export const teamInput = z.object({
  teamName: text(40).min(2, 'Team name is too short'),
  players: z.array(z.object({
    collegeId: collegeIdSchema,
    inGameId: text(40),
  })).min(1).max(10),
})
export type TeamInput = z.infer<typeof teamInput>

export const roomInput = z.object({ id: text(40).min(1, 'Room ID is required'), password: text(40), note: text(200) })
export type RoomInput = z.infer<typeof roomInput>

export const branchInput = z.object({
  name: text(60).min(2, 'College name is too short'),
  location: text(60).min(2, 'Location is too short'),
})
export type BranchInput = z.infer<typeof branchInput>

export const studentInput = z.object({
  collegeId: collegeIdSchema,
  name: text(60).min(2, 'Name is too short'),
  phone: phoneSchema,
  branch: text(40).min(1, 'Branch is required'),
})
export type StudentInput = z.infer<typeof studentInput>
