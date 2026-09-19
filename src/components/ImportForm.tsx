'use client'
import { useActionState } from 'react'
import type { ImportResult } from '@/lib/csv'
import { Button } from './Button'

export type ImportState = ImportResult | null
type Props = { action: (prev: ImportState, form: FormData) => Promise<ImportState>; columns: readonly string[]; noun: string; maxRows: number }

/** The CSV half of an admin list screen: same file picker, same report, whichever list it feeds. */
export function ImportForm({ action, columns, noun, maxRows }: Props) {
  const [state, run, pending] = useActionState<ImportState, FormData>(action, null)
  const report = state?.ok ? state.report : null
  const id = `import-${noun}`

  return (
    <form action={run} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm font-medium text-text">CSV file</label>
        <input id={id} type="file" name="file" accept=".csv,text/csv" required
          className="w-full rounded-xl bg-ink/70 p-3 text-text ring-1 ring-inset ring-line file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-accent file:px-5 file:py-2 file:font-semibold file:text-ink" />
        <p className="text-sm text-muted">
          First row names the columns: <span className="font-mono text-text">{columns.join(', ')}</span>. Any column order, up to {maxRows} rows.
          Re-importing a corrected sheet updates the existing rows instead of duplicating them.
        </p>
      </div>
      <Button type="submit" disabled={pending} className="self-start px-8">{pending ? 'Importing' : `Import ${noun}`}</Button>

      {state && !state.ok && <p role="alert" className="text-danger">{state.error}</p>}
      {report && (
        <div role="status" className="flex flex-col gap-2">
          <p className="text-text">
            {report.added} added, {report.updated} updated{report.unchanged ? `, ${report.unchanged} already correct` : ''}
            {report.failed.length ? `, ${report.failed.length} skipped` : ''}.
          </p>
          {report.failed.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-muted">
              {report.failed.slice(0, 10).map(f => <li key={f.line}>Line {f.line}: {f.reason}</li>)}
              {report.failed.length > 10 && <li>and {report.failed.length - 10} more.</li>}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}
