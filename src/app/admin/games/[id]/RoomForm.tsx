'use client'
import { useActionState } from 'react'
import { Button } from '@/components/Button'
import { Field, TextArea } from '@/components/Field'
import { publishRoomAction, type FormState } from '../../actions'

export function RoomForm({ id, room }: { id: string; room: { id: string; password: string; note: string } | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(publishRoomAction.bind(null, id), null)
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Room ID" name="id" required maxLength={40} defaultValue={room?.id} autoComplete="off" />
        <Field label="Password" name="password" maxLength={40} defaultValue={room?.password} autoComplete="off" />
      </div>
      <TextArea label="Note to players" name="note" maxLength={200} defaultValue={room?.note} hint="Optional. For example: lobby opens 8:45 pm, start is sharp." />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" name="intent" value="publish" disabled={pending}>{room ? 'Update room details' : 'Publish room details'}</Button>
        {room && <Button type="submit" name="intent" value="unpublish" variant="secondary" formNoValidate disabled={pending}>Unpublish</Button>}
        <p aria-live="polite" className={state?.ok ? 'text-text' : 'text-danger'}>{state?.ok ? state.message : state?.error}</p>
      </div>
    </form>
  )
}
