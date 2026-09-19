'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { authClient } from '@/lib/auth-client'
import { safeNext } from '@/lib/safe-next'
import { hasAccount } from './actions'
import { Button } from '@/components/Button'
import { Field } from '@/components/Field'
import { Panel } from '@/components/Panel'
import { PasswordField } from '@/components/PasswordField'

// where players write when they are stuck (a forgotten password goes to a person: the site sends no email)
const ORGANISERS_EMAIL = 'niatsportskkh@gmail.com'

type Mode = 'login' | 'signup'
const COPY: Record<Mode, { title: string; submit: string; busy: string }> = {
  login: { title: 'Log in', submit: 'Log in', busy: 'Logging in' },
  signup: { title: 'Sign up', submit: 'Create account', busy: 'Creating account' },
}

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const dest = safeNext(next)
  const withNext = (path: string) => (next ? `${path}?next=${encodeURIComponent(dest)}` : path)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    setError(''); setBusy(true)
    const res = mode === 'login'
      ? await authClient.signIn.email({ email: f.email, password: f.password })
      : await authClient.signUp.email({ name: f.name, email: f.email, phone: f.phone, collegeId: f.collegeId, password: f.password })
    setBusy(false)
    if (res.error) {
      // One code covers both halves of a failed login; ask which it was only once we know it failed.
      if (mode === 'login' && res.error.code === 'INVALID_EMAIL_OR_PASSWORD')
        return setError((await hasAccount(f.email)) ? 'Wrong password. Try again.' : 'No account with this email yet. Sign up below.')
      return setError(res.error.message ?? 'That did not work. Try again.')
    }
    router.push(dest)
    router.refresh() // the nav is a server component: re-render it with the new session
  }

  const c = COPY[mode]
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="display mb-6 text-4xl sm:text-5xl">{c.title}</h1>
      <Panel inner="p-5 sm:p-7">
        <form onSubmit={submit} className="flex flex-col gap-5">
          {mode === 'signup' && <Field label="Name" name="name" required minLength={2} maxLength={60} autoComplete="name" hint="Your teammates and the organisers see this." />}
          <Field label="Email" name="email" type="email" required autoComplete="email" inputMode="email" />
          {mode === 'signup' && (
            <>
              <Field label="NIAT ID" name="collegeId" required minLength={3} maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false}
                placeholder="N26H01A0001" hint="Exactly as NIAT gave it to you. Your account is only created if it matches the student list." />
              <Field label="NIAT registered number" name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="98765 43210"
                hint="The mobile number NIAT has on file for you. No OTP." />
            </>
          )}
          <PasswordField label="Password" name="password" required minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} hint={mode === 'login' ? undefined : 'At least 8 characters.'} />
          <p aria-live="polite" className={`text-danger ${error ? '' : 'hidden'}`}>{error}</p>
          <Button type="submit" disabled={busy}>{busy ? c.busy : c.submit}</Button>
        </form>
      </Panel>
      <p className="mt-5 text-muted">
        {mode === 'login' && <>New here? <Link className="font-semibold text-text underline underline-offset-4" href={withNext('/signup')}>Sign up</Link>.</>}
        {mode === 'signup' && <>Already have an account? <Link className="font-semibold text-text underline underline-offset-4" href={withNext('/login')}>Log in</Link>. Not on the student list yet? Ask the organisers to add you.</>}
      </p>
      {/* the site sends no email, so a forgotten password goes to a person: an admin sets a new one */}
      {mode === 'login' && (
        <p className="mt-3 text-muted">
          Forgot your password? Email{' '}
          <a className="font-semibold text-text underline underline-offset-4" href={`mailto:${ORGANISERS_EMAIL}?subject=${encodeURIComponent('Forgot my Clutch password')}`}>{ORGANISERS_EMAIL}</a>{' '}
          from the email you signed up with and include your NIAT ID. An organiser will set a new one for you.
        </p>
      )}
    </div>
  )
}
