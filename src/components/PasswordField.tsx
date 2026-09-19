'use client'
import { useId, useState, type ComponentProps } from 'react'
import { control } from './Field'

/** Field's twin for passwords, with Show/Hide so people can check what they typed. Toggling keeps the value. */
export function PasswordField({ label, hint, error, className = '', ...input }: { label: string; hint?: string; error?: string } & Omit<ComponentProps<'input'>, 'type'>) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text">{label}</label>
      <div className="relative">
        <input id={id} type={shown ? 'text' : 'password'} spellCheck={false} autoCapitalize="off" aria-invalid={!!error || undefined}
          aria-describedby={hint || error ? `${id}-d` : undefined} className={`${control} h-12 pr-20`} {...input} />
        <button type="button" onClick={() => setShown(s => !s)} aria-controls={id} aria-pressed={shown} aria-label={shown ? 'Hide password' : 'Show password'}
          className="absolute inset-y-1.5 right-1.5 min-w-14 rounded-lg px-3 text-sm font-semibold text-muted transition-colors duration-300 hover:bg-white/[0.06] hover:text-text">
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      {(error || hint) && <p id={`${id}-d`} className={`text-sm ${error ? 'text-danger' : 'text-muted'}`}>{error ?? hint}</p>}
    </div>
  )
}
