import type { Room } from '@/lib/tournaments'
import { CopyButton } from './CopyButton'
import { Panel } from './Panel'

/** Server-rendered, and only ever for a confirmed registrant: room details never reach anyone else's browser. */
export function RoomPanel({ room }: { room: Room | null }) {
  if (!room) {
    return (
      <Panel inner="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-text">Room details</h2>
        <p className="mt-1 text-muted">The room ID and password appear here before the match. Check back close to start time.</p>
      </Panel>
    )
  }
  return (
    <Panel inner="p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-text">Room details</h2>
      <dl className="mt-4 flex flex-col gap-3">
        {([['Room ID', room.id], ['Password', room.password]] as const).filter(([, v]) => v).map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-ink/70 py-2 pr-2 pl-4 ring-1 ring-inset ring-line">
            <div className="min-w-0">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="truncate font-mono text-xl font-semibold text-accent">{value}</dd>
            </div>
            <CopyButton value={value} label={label} />
          </div>
        ))}
      </dl>
      {room.note && <p className="mt-4 whitespace-pre-line text-muted">{room.note}</p>}
    </Panel>
  )
}
