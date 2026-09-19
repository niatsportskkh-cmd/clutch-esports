import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { listBranches, listLocations } from '@/lib/branches'
import { students } from '@/lib/students'
import { Button } from '@/components/Button'
import { ImportForm } from '@/components/ImportForm'
import { Panel } from '@/components/Panel'
import { importBranchesAction } from './actions'
import { CollegeForm, RemoveCollege } from './CollegeForms'
import { BackLink } from '@/components/BackLink'

export const metadata = { title: 'Colleges' }

export default async function CollegesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireAdmin()
  const { edit = '' } = await searchParams
  const [all, locations] = await Promise.all([listBranches(), listLocations()])
  const counts = new Map<string, number>(
    (await students().aggregate<{ _id: string; n: number }>([{ $group: { _id: '$branch', n: { $sum: 1 } } }]).toArray()).map(r => [r._id, r.n]),
  )
  const editing = all.find(b => b.name === edit)
  const byLocation = locations.map(l => ({ location: l, colleges: all.filter(b => b.location === l) }))

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div>
        <BackLink href="/admin">Admin</BackLink>
        <h1 className="display mt-4 text-4xl sm:text-5xl">Colleges</h1>
        <p className="mt-3 max-w-[64ch] text-lg text-muted">
          Every college and the city it is in. Students are listed under one of these, contests are opened to a set of them,
          and a team&apos;s location comes from its college, so this list is what makes those filters mean anything.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="display text-2xl">Import a list</h2>
        <Panel inner="p-5 sm:p-7"><ImportForm action={importBranchesAction} columns={['name', 'location']} noun="colleges" maxRows={500} /></Panel>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="display text-2xl">{editing ? `Edit ${editing.name}` : 'Add one'}</h2>
        <Panel inner="p-5 sm:p-7"><CollegeForm locations={locations} initial={editing && { name: editing.name, location: editing.location }} /></Panel>
        {editing && <Link href="/admin/colleges" className="self-start text-muted underline underline-offset-4 hover:text-text">Cancel edit</Link>}
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="display text-2xl">On the list <span className="num text-muted">{all.length}</span></h2>
        {all.length === 0 && <p className="text-muted">No colleges yet. Import a CSV above, then the student roster.</p>}
        {byLocation.map(({ location, colleges }) => (
          <div key={location} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-accent uppercase">{location}</h3>
            <ul className="flex flex-col gap-2">
              {colleges.map(b => (
                <li key={b.name}>
                  <Panel inner="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 p-3 px-4 sm:px-5">
                    <span className="font-semibold text-text">{b.name}</span>
                    <span className="num text-sm text-muted">{counts.get(b.name) ?? 0} students</span>
                    <span className="flex items-center gap-2">
                      <Button href={`/admin/colleges?edit=${encodeURIComponent(b.name)}`} variant="ghost" className="min-h-10 px-3 text-sm">Edit</Button>
                      <RemoveCollege name={b.name} />
                    </span>
                  </Panel>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}
