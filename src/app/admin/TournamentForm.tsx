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
  // after an error React resets the form to its defaults, so the defaults are what was just submitted
  const ticked = kept ? (kept.branches ?? '').split('\n') : initial.branches
  const askIgn = kept ? kept.requireInGameId === 'on' : initial.requireInGameId
  const byLocation = [...new Set(colleges.map(c => c.location))].map(l => ({ location: l, names: colleges.filter(c => c.location === l).map(c => c.name) }))

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="grid items-start gap-5 sm:grid-cols-2">
        {/* a disabled select is not submitted, so a locked game travels in a hidden field */}
        {locked && <input type="hidden" name="game" value={game} />}
        {/* key: React applies a select's defaultValue only on mount, and the reset after an error goes back to it */}
        <Select key={kept?.game} label="Game" name={locked ? undefined : 'game'} defaultValue={kept?.game ?? initial.game} disabled={locked} onChange={e => setGame(e.target.value as Game)}
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

      <fieldset>
        <legend className="text-sm font-medium text-text">Colleges</legend>
        <p className="mt-1 mb-3 text-sm text-muted">
          Only students of the colleges you tick can see this contest or register for it. There is no cap on teams.
        </p>
        {colleges.length === 0 ? (
          <p className="text-danger">No colleges on the list yet. Add them under Colleges first.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {byLocation.map(({ location, names }) => (
              <div key={location}>
                <p className="mb-2 text-sm font-semibold tracking-wide text-accent uppercase">{location}</p>
                <div className="flex flex-wrap gap-2">
                  {names.map(n => (
                    <label key={n} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold text-muted ring-1 ring-inset ring-line transition-colors duration-300 has-checked:bg-accent/15 has-checked:text-accent has-checked:ring-accent has-focus-visible:outline-2 has-focus-visible:outline-accent">
                      <input type="checkbox" name="branches" value={n} defaultChecked={ticked.includes(n)} className="sr-only" />
                      {n}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="requireInGameId" defaultChecked={askIgn} className="mt-1 h-5 w-5 accent-(--accent)" />
        <span>
          <span className="font-medium text-text">Ask for an in-game ID</span>
          <span className="block text-muted">Each player types their {GAME[game].name} ID. No two players in the contest can use the same one.</span>
        </span>
      </label>

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
