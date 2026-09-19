'use client'
import { useActionState } from 'react'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { adminEditTeamAction, type AdminTeamState } from './actions'

type Props = { id: string; teamSize: number; requireInGameId: boolean; branch: string; captainCollegeId: string
  initial: { teamName: string; collegeIds: string[]; inGameIds: string[] } }

export function TeamForm({ id, teamSize, requireInGameId, branch, captainCollegeId, initial }: Props) {
  const [state, action, pending] = useActionState<AdminTeamState, FormData>(adminEditTeamAction.bind(null, id), null)
  const kept = state && !state.ok ? state : null
  const at = (i: number) => kept?.collegeIds[i] ?? initial.collegeIds[i] ?? ''
  const gameAt = (i: number) => kept?.inGameIds[i] ?? initial.inGameIds[i] ?? ''

  return (
    <form action={action} className="flex flex-col gap-6">
      <Field label="Team name" name="teamName" required minLength={2} maxLength={40} autoComplete="off" defaultValue={kept?.teamName ?? initial.teamName} />
      <fieldset className="flex flex-col gap-5">
        <legend className="sr-only">Players</legend>
        <p className="text-sm text-muted">
          Players are looked up on the student list and must all be from <span className="font-semibold text-text">{branch}</span>.
          The captain ({captainCollegeId}) stays on the team. No registration deadline applies to you.
        </p>
        {Array.from({ length: teamSize }, (_, i) => (
          <div key={i} className={`grid gap-4 ${requireInGameId ? 'sm:grid-cols-2' : ''}`}>
            <Field label={`Player ${i + 1} NIAT ID`} name="collegeId" required minLength={3} maxLength={24}
              autoComplete="off" autoCapitalize="characters" spellCheck={false} defaultValue={at(i)} />
            {requireInGameId && <Field label={`Player ${i + 1} in-game ID`} name="inGameId" required maxLength={40} autoComplete="off" spellCheck={false} defaultValue={gameAt(i)} />}
          </div>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>{pending ? 'Saving' : 'Save team'}</Button>
        <p aria-live="polite" className={state?.ok ? 'text-text' : 'text-danger'}>{state ? (state.ok ? state.message : state.error) : ''}</p>
      </div>
    </form>
  )
}
