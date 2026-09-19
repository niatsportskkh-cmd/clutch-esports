'use client'
import { useState, type FormEvent } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/Button'
import { PasswordField } from '@/components/PasswordField'

/** Asks for the current password, so a phone left logged in cannot be used to lock its owner out. */
export function ChangePasswordForm() {
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    setStatus(null); setBusy(true)
    const res = await authClient.changePassword({ currentPassword: String(f.get('current')), newPassword: String(f.get('next')), revokeOtherSessions: true })
    setBusy(false)
    if (res.error) return setStatus({ ok: false, text: res.error.code === 'INVALID_PASSWORD' ? 'Your current password is wrong.' : (res.error.message ?? 'That did not work. Try again.') })
    form.reset()
    setStatus({ ok: true, text: 'Password changed. Any other device you were logged in on is signed out.' })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <PasswordField label="Current password" name="current" required autoComplete="current-password" />
      <PasswordField label="New password" name="next" required minLength={8} maxLength={128} autoComplete="new-password" hint="At least 8 characters." />
      <p aria-live="polite" className={`${status?.ok ? 'text-text' : 'text-danger'} ${status ? '' : 'hidden'}`}>{status?.text}</p>
      <Button type="submit" disabled={busy} className="self-start px-8">{busy ? 'Changing password' : 'Change password'}</Button>
    </form>
  )
}
