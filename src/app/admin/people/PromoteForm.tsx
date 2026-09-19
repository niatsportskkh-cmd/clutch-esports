'use client'
import { useActionState, useState } from 'react'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Field } from '@/components/Field'
import { setRoleAction, type FormState } from '../actions'

export function PromoteForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setRoleAction, null)
  const [email, setEmail] = useState('')
  const failed = state && !state.ok ? state : null

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="role" value="admin" />
      <Field
        label="Email" name="email" type="email" required autoComplete="off" inputMode="email"
        value={email} onChange={e => setEmail(e.target.value)}
        error={failed?.error}
        hint={failed ? undefined : 'They need a Clutch account already. Promote the address they signed up with.'}
      />
      {state?.ok && <p role="status" className="text-text">{state.message}</p>}
      <ConfirmButton
        disabled={pending || !email}
        className="self-start px-8"
        message={`Make ${email} an admin? They will be able to manage every game, every team, and other admins.`}
      >
        {pending ? 'Making admin' : 'Make admin'}
      </ConfirmButton>
    </form>
  )
}
