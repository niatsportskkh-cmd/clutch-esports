'use client'
import { useActionState } from 'react'
import { Button } from '@/components/Button'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Field } from '@/components/Field'
import { saveBranchAction, deleteBranchAction, type BranchState } from './actions'

/** With `initial`, edits that college in place: its students, accounts, contests and teams follow the new name. */
export function CollegeForm({ locations, initial }: { locations: string[]; initial?: { name: string; location: string } }) {
  const [state, action, pending] = useActionState<BranchState, FormData>(saveBranchAction, null)
  const kept = state && !state.ok ? state.values : null

  return (
    <form action={action} key={initial?.name ?? 'new'} className="flex flex-col gap-5">
      {initial && <input type="hidden" name="original" value={initial.name} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="College" name="name" required maxLength={60} autoComplete="off" defaultValue={kept?.name ?? initial?.name} placeholder="KKH" />
        {/* a datalist, not a select: the first college in a new city has to be able to name that city */}
        <Field label="Location" name="location" required maxLength={60} autoComplete="off" list="known-locations" defaultValue={kept?.location ?? initial?.location} placeholder="Hyderabad" />
        <datalist id="known-locations">{locations.map(l => <option key={l} value={l} />)}</datalist>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending} className="px-8">{pending ? 'Saving' : initial ? 'Save changes' : 'Add college'}</Button>
        <p aria-live="polite" className={state && !state.ok ? 'text-danger' : 'text-text'}>{state ? (state.ok ? state.message : state.error) : ''}</p>
      </div>
      <p className="text-sm text-muted">{initial
        ? 'Renaming moves its students, their accounts, its contests and its teams to the new name.'
        : 'A college already on the list has its location updated, not duplicated.'}</p>
    </form>
  )
}

/** Its own form state, because removing a college that still has students has to say so rather than fail quietly. */
export function RemoveCollege({ name }: { name: string }) {
  const [state, action, pending] = useActionState<BranchState, FormData>(deleteBranchAction, null)
  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="name" value={name} />
      <ConfirmButton variant="danger" disabled={pending} className="min-h-10 px-3 text-sm"
        message={`Remove ${name}? Contests already scoped to it keep the name, but nobody new can be added under it.`}>
        Remove
      </ConfirmButton>
      {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  )
}
