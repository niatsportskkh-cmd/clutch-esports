'use client'
import { useActionState, useState } from 'react'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Field } from '@/components/Field'
import { PasswordField } from '@/components/PasswordField'
import { setPasswordAction, type FormState } from '../actions'

/** For a player who forgot their password: the login page tells them to email the organisers, who set one here. */
export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(setPasswordAction, null)
  const failed = state && !state.ok ? state : null
  // React resets the form after each action, back to its defaults: so the box is uncontrolled, its default is what
  // was just submitted after an error (empty after a success), and `who` (for the confirm message) follows each result
  const [who, setWho] = useState('')
  const [seen, setSeen] = useState(state)
  if (state !== seen) { setSeen(state); setWho(failed?.values?.who ?? '') }

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Email or NIAT ID" name="who" required autoComplete="off" spellCheck={false} defaultValue={failed?.values?.who ?? ''} onChange={e => setWho(e.target.value)}
        error={failed?.error} hint={failed ? undefined : 'The account they log in with.'} />
      <PasswordField label="New password" name="password" required minLength={8} maxLength={128} autoComplete="new-password"
        hint="At least 8 characters. They can change it themselves from My games afterwards." />
      {state?.ok && <p role="status" className="text-text">{state.message}</p>}
      <ConfirmButton disabled={pending || !who} className="self-start px-8"
        message={`Set a new password for ${who}? They will be signed out on every device.`}>
        {pending ? 'Changing password' : 'Change password'}
      </ConfirmButton>
    </form>
  )
}
