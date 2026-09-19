import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { listStudents } from '@/lib/students'
import { branchNames } from '@/lib/branches'
import { Button } from '@/components/Button'
import { ConfirmButton } from '@/components/ConfirmButton'
import { Panel } from '@/components/Panel'
import { deleteStudentAction } from './actions'
import { ImportForm } from '@/components/ImportForm'
import { StudentForm } from './StudentForm'
import { importStudentsAction } from './actions'
import { BackLink } from '@/components/BackLink'

export const metadata = { title: 'Students' }

type Search = { q?: string; branch?: string; page?: string; edit?: string }

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin()
  const { q = '', branch = '', page: rawPage = '1', edit = '' } = await searchParams
  const page = Math.max(1, Number(rawPage) || 1)
  const [{ rows, total, pages }, branches] = await Promise.all([listStudents({ q, branch, page }), branchNames()])
  const editing = edit ? rows.find(r => r.collegeId === edit) : undefined
  // filters travel in the URL, so a search survives a reload and can be shared
  const link = (over: Partial<Search>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(branch ? { branch } : {}), ...over } as Record<string, string>)
    return `/admin/students${p.size ? `?${p}` : ''}`
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <div>
        <BackLink href="/admin">Admin</BackLink>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Students</h1>
        <p className="mt-3 max-w-[64ch] text-lg text-muted">
          The list every account and every team is checked against. Nobody can sign up unless their NIAT ID and mobile number
          are both on a row here, and teams are built by looking players up in it.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="display text-2xl">Import a roster</h2>
        <Panel inner="p-5 sm:p-7"><ImportForm action={importStudentsAction} columns={['collegeId', 'name', 'phone', 'branch']} noun="roster" maxRows={5000} /></Panel>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="display text-2xl">{editing ? `Edit ${editing.collegeId}` : 'Add one student'}</h2>
        <Panel inner="p-5 sm:p-7"><StudentForm initial={editing} colleges={branches} /></Panel>
        {editing && <Link href={link({})} className="self-start text-muted underline underline-offset-4 hover:text-text">Cancel edit</Link>}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="display text-2xl">On the list <span className="num text-muted">{total}</span></h2>
          {/* a GET form: the browser does the work, no client state to keep in sync */}
          <form className="flex flex-wrap gap-2">
            <input name="q" defaultValue={q} placeholder="Name or ID" aria-label="Search students"
              className="h-11 rounded-xl bg-ink/70 px-4 text-text ring-1 ring-inset ring-line outline-none placeholder:text-muted/80 focus:ring-2 focus:ring-accent" />
            <select name="branch" defaultValue={branch} aria-label="Filter by college"
              className="h-11 appearance-none rounded-xl bg-ink/70 px-4 text-text ring-1 ring-inset ring-line outline-none focus:ring-2 focus:ring-accent">
              <option value="">Every college</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <Button type="submit" variant="secondary" className="px-5">Search</Button>
          </form>
        </div>

        {total === 0 && <p className="text-muted">{q || branch ? 'Nothing matches that search.' : 'Nobody on the list yet. Import a CSV above.'}</p>}

        <ul className="flex flex-col gap-2">
          {rows.map(s => (
            <li key={s.collegeId}>
              <Panel inner="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 px-4 sm:px-5">
                <span className="font-mono text-sm font-semibold text-accent">{s.collegeId}</span>
                <span className="min-w-0 flex-1 basis-40 truncate text-text">{s.name}</span>
                <span className="text-sm text-muted">{s.branch}</span>
                <span className="num text-sm text-muted">{s.phone}</span>
                <span className="flex gap-2">
                  <Button href={link({ edit: s.collegeId, page: String(page) })} variant="ghost" className="min-h-10 px-3 text-sm">Edit</Button>
                  <form action={deleteStudentAction}>
                    <input type="hidden" name="collegeId" value={s.collegeId} />
                    <ConfirmButton variant="danger" className="min-h-10 px-3 text-sm"
                      message={`Remove ${s.name} (${s.collegeId}) from the student list? They will not be able to sign up or join a team until they are back on it.`}>
                      Remove
                    </ConfirmButton>
                  </form>
                </span>
              </Panel>
            </li>
          ))}
        </ul>

        {pages > 1 && (
          <nav className="flex items-center justify-between gap-4" aria-label="Pages">
            <Button href={link({ page: String(page - 1) })} variant="secondary" disabled={page <= 1} className="px-5">Back</Button>
            <p className="num text-sm text-muted">Page {page} of {pages}</p>
            <Button href={link({ page: String(page + 1) })} variant="secondary" disabled={page >= pages} className="px-5">Next</Button>
          </nav>
        )}
      </section>
    </div>
  )
}
