import { ObjectId } from 'mongodb'
import { db, ensureIndexes } from './db.ts'
import { readTable, type ImportReport, type ImportResult } from './csv.ts'
import { branchInput, type BranchInput } from './schemas.ts'

/** A branch is one college; its location is the city it sits in. One list, so every other screen means the same thing by "KKH". */
export type Branch = { _id: ObjectId; name: string; location: string; updatedAt: Date }

export const branches = () => db.collection<Branch>('branches')

export const listBranches = () => branches().find().sort({ location: 1, name: 1 }).toArray()
export const branchNames = async () => (await branches().find({}, { projection: { name: 1 } }).toArray()).map(b => b.name)
export const listLocations = () => branches().distinct('location')
export const getBranch = (name: string) => branches().findOne({ name })

export async function saveBranch(input: BranchInput) {
  await ensureIndexes()
  const { upsertedCount } = await branches().updateOne({ name: input.name }, { $set: { ...input, updatedAt: new Date() } }, { upsert: true })
  return { added: upsertedCount === 1 }
}

/**
 * Edit a college in place. The name is copied onto students, their accounts, contests and teams, so all of
 * those follow it, or a renamed college's students would drop out of every contest opened to it.
 * The copies are rewritten before the college itself: a crash half way leaves the old college standing,
 * and saving the same edit again finishes the job.
 */
export async function editBranch(oldName: string, input: BranchInput) {
  if (!(await getBranch(oldName))) return { ok: false as const, error: `${oldName} is not on the list any more.` }
  if (input.name !== oldName && (await getBranch(input.name))) {
    return { ok: false as const, error: `${input.name} is already a college. Pick another name, or move the students there one by one.` }
  }
  if (input.name !== oldName) {
    await Promise.all([
      db.collection('students').updateMany({ branch: oldName }, { $set: { branch: input.name } }),
      db.collection('user').updateMany({ branch: oldName }, { $set: { branch: input.name } }),
      db.collection('tournaments').updateMany({ branches: oldName }, { $set: { 'branches.$': input.name } }),
    ])
  }
  await db.collection('teams').updateMany({ branch: oldName }, { $set: { branch: input.name, location: input.location } })
  await branches().updateOne({ name: oldName }, { $set: { ...input, updatedAt: new Date() } })
  return { ok: true as const }
}

/** Refused while students still point at it: a roster row naming a college that does not exist has no location. */
export async function deleteBranch(name: string) {
  const inUse = await db.collection('students').countDocuments({ branch: name }, { limit: 1 })
  if (inUse) return { ok: false as const, error: `Students are still listed under ${name}. Move or remove them first.` }
  await branches().deleteOne({ name })
  return { ok: true as const }
}

const COLUMNS = ['name', 'location'] as const

export async function importBranches(csv: string): Promise<ImportResult> {
  const table = readTable(csv, COLUMNS, 500)
  if (!table.ok) return table

  const failed: ImportReport['failed'] = []
  const byName = new Map<string, BranchInput>()
  table.rows.forEach((r, i) => {
    const parsed = branchInput.safeParse(r)
    if (!parsed.success) return void failed.push({ line: i + 2, reason: parsed.error.issues[0].message })
    byName.set(parsed.data.name, parsed.data)
  })
  if (!byName.size) return { ok: false, error: `Nothing usable in that file. First problem: line ${failed[0]?.line}, ${failed[0]?.reason}` }

  await ensureIndexes()
  const now = new Date()
  const res = await branches().bulkWrite(
    [...byName.values()].map(b => ({ updateOne: { filter: { name: b.name }, update: { $set: { ...b, updatedAt: now } }, upsert: true } })),
    { ordered: false },
  )
  return { ok: true, report: { added: res.upsertedCount, updated: res.modifiedCount, unchanged: byName.size - res.upsertedCount - res.modifiedCount, failed } }
}
