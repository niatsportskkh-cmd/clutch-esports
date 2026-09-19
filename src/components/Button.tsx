import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-[0.95rem] font-semibold whitespace-nowrap select-none ' +
  'transition-[transform,background-color,color,box-shadow] duration-500 ease-spring active:scale-[0.97] ' +
  'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45'

const variants = {
  primary: 'bg-accent text-ink hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_var(--accent)]',
  secondary: 'bg-white/[0.06] text-text ring-1 ring-inset ring-white/15 hover:bg-white/[0.12]',
  ghost: 'text-muted hover:bg-white/[0.06] hover:text-text',
  danger: 'bg-danger/15 text-danger ring-1 ring-inset ring-danger/40 hover:bg-danger/25',
}

type Props = { variant?: keyof typeof variants; href?: string; disabled?: boolean; className?: string; children: ReactNode }

/** One button for the whole site. With `href` it is a link; a disabled link renders as inert text, never a dead anchor. */
export function Button({ variant = 'primary', href, disabled, className = '', children, ...rest }: Props & Omit<ComponentProps<'button'>, keyof Props>) {
  const cls = `${base} ${variants[variant]} ${className}`
  if (href && disabled) return <span aria-disabled className={cls}>{children}</span>
  if (href) return <Link href={href} className={cls}>{children}</Link>
  return <button disabled={disabled} className={cls} {...rest}>{children}</button>
}
