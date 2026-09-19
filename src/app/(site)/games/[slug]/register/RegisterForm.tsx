'use client'
import { useActionState, type CSSProperties } from 'react'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { registerAction, type RegisterState } from './actions'

type Props = {
  slug: string; teamSize: number; requireInGameId: boolean; idHint: string
  captainCollegeId: string; captainName: string; branch: string
  teamId?: string; initial?: { teamName: string; collegeIds: string[]; inGameIds: string[] }
}

export function RegisterForm({ slug, teamSize, requireInGameId, idHint, captainCollegeId, captainName, branch, teamId, initial }: Props) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerAction.bind(null, slug, teamId ?? null), null)
  const kept = state && !state.ok ? state : null
  const at = (i: number) => kept?.collegeIds[i] ?? initial?.collegeIds[i] ?? (i === 0 ? captainCollegeId : '')
  const gameAt = (i: number) => kept?.inGameIds[i] ?? initial?.inGameIds[i] ?? ''

  return (
    <form action={action} className="flex flex-col gap-8">
      {/* a solo game still stores the entry under a name, so it asks for the player's instead of a team's */}
      <Field label={teamSize === 1 ? 'Name in this contest' : 'Team name'} name="teamName" required minLength={2} maxLength={40} autoComplete="off"
        defaultValue={kept?.teamName ?? initial?.teamName ?? (teamSize === 1 ? captainName.slice(0, 40) : undefined)}
        placeholder={teamSize === 1 ? 'Your name or gamer tag' : 'What should we call your team?'} />

      <fieldset className="stagger flex flex-col gap-6">
        <legend className="sr-only">Players</legend>
        <p className="text-muted">
          {teamSize === 1
            ? <>Your name and number come from the student list. You have to be from <span className="font-semibold text-text">{branch}</span>.</>
            : <>Type each player&apos;s NIAT ID. Their name and number come from the student list, so there is nothing to spell wrong.
              Everyone has to be from <span className="font-semibold text-text">{branch}</span>.</>}
        </p>
        {Array.from({ length: teamSize }, (_, i) => (
          <div key={i} style={{ '--i': i } as CSSProperties}>
            <p className="mb-3 font-semibold text-text">
              {teamSize === 1 ? 'Player' : i === 0 ? 'Captain' : `Player ${i + 1}`}
              {i === 0 && <span className="ml-2 text-sm font-normal text-muted">That is you, {captainName}</span>}
            </p>
            <div className={`grid gap-4 ${requireInGameId ? 'sm:grid-cols-2' : ''}`}>
              {/* the captain's own slot is fixed: a team always contains the person who made it */}
              <Field label="NIAT ID" name="collegeId" required minLength={3} maxLength={24} autoComplete="off" autoCapitalize="characters"
                spellCheck={false} readOnly={i === 0} defaultValue={at(i)} placeholder="N26H01A0001" />
              {requireInGameId && (
                <Field label="In-game ID" name="inGameId" required minLength={2} maxLength={40} autoComplete="off" autoCapitalize="off"
                  spellCheck={false} defaultValue={gameAt(i)} placeholder={idHint} />
              )}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="flex flex-col gap-3">
        <p aria-live="polite" className={`min-h-6 text-danger ${kept ? '' : 'invisible'}`}>{kept?.error}</p>
        <Button type="submit" disabled={pending} className="self-start px-8">
          {pending ? (teamId ? 'Saving' : 'Registering') : teamId ? 'Save team' : 'Register my team'}
        </Button>
      </div>
    </form>
  )
}
