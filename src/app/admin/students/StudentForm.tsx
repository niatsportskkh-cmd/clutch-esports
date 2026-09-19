'use client'
import { useActionState } from 'react'
import { Button } from '@/components/Button'
import { Field, Select } from '@/components/Field'
import { saveStudentAction, type StudentState } from './actions'

/** Upserts on college ID, so one form both adds a student and corrects one (the changed-phone case). */
export function StudentForm({ initial, colleges }: { initial?: { collegeId: string; name: string; phone: string; branch: string }; colleges: string[] }) {
  const [state, action, pending] = useActionState<StudentState, FormData>(saveStudentAction, null)
  const kept = state && !state.ok ? state.values : null

  return (
    <form action={action} key={initial?.collegeId ?? 'new'} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="NIAT ID" name="collegeId" required maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false}
          defaultValue={kept?.collegeId ?? initial?.collegeId} placeholder="N26H01A0001" />
        <Field label="Name" name="name" required maxLength={60} autoComplete="off" defaultValue={kept?.name ?? initial?.name} />
        <Field label="Mobile" name="phone" type="tel" required autoComplete="off" inputMode="tel"
          defaultValue={kept?.phone ?? initial?.phone} placeholder="98765 43210" />
        <Select label="College" name="branch" required defaultValue={kept?.branch ?? initial?.branch ?? ''}>
          <option value="" disabled>Pick a college</option>
          {colleges.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending} className="px-8">{pending ? 'Saving' : initial ? 'Save changes' : 'Add student'}</Button>
        <p aria-live="polite" className={state && !state.ok ? 'text-danger' : 'text-text'}>{state ? (state.ok ? state.message : state.error) : ''}</p>
      </div>
      <p className="text-sm text-muted">An ID already on the list is overwritten, not duplicated.</p>
    </form>
  )
}
