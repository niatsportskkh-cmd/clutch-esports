'use client'
import type { ComponentProps } from 'react'
import { Button } from './Button'

/** A submit button that asks first. Native confirm(): accessible, zero markup, and the right weight for a rare destructive action. */
export function ConfirmButton({ message, ...rest }: { message: string } & ComponentProps<typeof Button>) {
  return <Button type="submit" onClick={e => { if (!confirm(message)) e.preventDefault() }} {...rest} />
}
