import { useId, type ComponentProps } from 'react'

export const control =
  'w-full rounded-xl bg-ink/70 px-4 text-text ring-1 ring-inset ring-line outline-none placeholder:text-muted/80 ' +
  'transition-shadow duration-300 ease-spring focus:ring-2 focus:ring-accent aria-invalid:ring-danger'

type Base = { label: string; hint?: string; error?: string }

/** Label above, hint and error below. Never placeholder-as-label. */
export function Field({ label, hint, error, className = '', ...input }: Base & ComponentProps<'input'>) {
  const id = useId()
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text">{label}</label>
      <input id={id} aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${id}-d` : undefined} className={`${control} h-12`} {...input} />
      {(error || hint) && <p id={`${id}-d`} className={`text-sm ${error ? 'text-danger' : 'text-muted'}`}>{error ?? hint}</p>}
    </div>
  )
}

export function TextArea({ label, hint, className = '', ...area }: Base & ComponentProps<'textarea'>) {
  const id = useId()
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text">{label}</label>
      <textarea id={id} className={`${control} min-h-36 py-3 leading-relaxed`} {...area} />
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  )
}

export function Select({ label, hint, className = '', children, ...select }: Base & ComponentProps<'select'>) {
  const id = useId()
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-text">{label}</label>
      <select id={id} className={`${control} h-12 appearance-none`} {...select}>{children}</select>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  )
}
