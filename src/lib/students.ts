import { ObjectId } from 'mongodb'
import { db, ensureIndexes } from './db.ts'
import { readTable, type ImportReport, type ImportResult } from './csv.ts'
import { branchNames, getBranch } from './branches.ts'
import { studentInput, type StudentInput } from './schemas.ts'

export type Student = { _id: ObjectId; collegeId: string; name: string; phone: string; branch: string; updatedAt: Date }

export const students = () => db.collection<Student>('students')

/** The sign-up gate. Both halves have to match one roster row, which is what stops anyone claiming someone else's ID. */
export const findStudent = (collegeId: string, phone: string) => students().findOne({ collegeId, phone })

export async function listStudents({ q = '', branch = '', page = 1, perPage = 50 } = {}) {
  await ensureIndexes()
  const term = q.trim()
  const filter = {
    ...(branch ? { branch } : {}),
    // escaped: a roster search box must not let a stray ( or * throw a regex error
    ...(term ? { $or: [{ collegeId: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { name: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }] } : {}),
  }
  const [rows, total] = await Promise.all([
    students().find(filter).sort({ branch: 1, name: 1 }).skip((page - 1) * perPage).limit(perPage).toArray(),
    students().countDocuments(filter),
  ])
  return { rows, total, pages: Math.max(1, Math.ceil(total / perPage)) }
}

/** Upsert by college ID, so the same form adds a new student and fixes an existing one (a changed phone number). */
export async function saveStudent(input: StudentInput) {
  await ensureIndexes()
  if (!(await getBranch(input.branch))) {
    return { ok: false as const, error: `${input.branch} is not a college on the list. Add it under Colleges first.` }
  }
  const { upsertedCount } = await students().updateOne(
    { collegeId: input.collegeId },
    { $set: { ...input, updatedAt: new Date() } },
    { upsert: true },
  )
  return { ok: true as const, added: upsertedCount === 1 }
}

export async function deleteStudent(collegeId: string) {
  const { deletedCount } = await students().deleteOne({ collegeId })
  return deletedCount === 1
}

const COLUMNS = ['collegeId', 'name', 'phone', 'branch'] as const
const MAX_ROWS = 5000

/**
 * A spreadsheet export, header row first, in any column order. Rows are upserted by college ID:
 * re-importing a corrected sheet fixes the roster instead of duplicating it. Every branch has to be
 * a college already on the list, or the row is skipped by name — a student in a college that does
 * not exist has no location, and every team filter would silently lose them.
 */
export async function importStudents(csv: string): Promise<ImportResult> {
  const table = readTable(csv, COLUMNS, MAX_ROWS)
  if (!table.ok) return table

  const known = new Set(await branchNames())
  if (!known.size) return { ok: false, error: 'No colleges on the list yet. Add them under Colleges first, so every student has a location.' }

  const failed: ImportReport['failed'] = []
  const byId = new Map<string, StudentInput>()
  table.rows.forEach((r, i) => {
    const parsed = studentInput.safeParse(r)
    // +2: the header is line 1 and spreadsheets count from 1, so this is the line number they see
    if (!parsed.success) return void failed.push({ line: i + 2, reason: parsed.error.issues[0].message })
    if (!known.has(parsed.data.branch)) return void failed.push({ line: i + 2, reason: `${parsed.data.branch} is not a college on the list` })
    byId.set(parsed.data.collegeId, parsed.data) // a college ID repeated in one file: the last row wins
  })
  if (!byId.size) return { ok: false, error: `Nothing usable in that file. First problem: line ${failed[0]?.line}, ${failed[0]?.reason}` }

  await ensureIndexes()
  const now = new Date()
  const res = await students().bulkWrite(
    [...byId.values()].map(s => ({ updateOne: { filter: { collegeId: s.collegeId }, update: { $set: { ...s, updatedAt: now } }, upsert: true } })),
    { ordered: false },
  )
  return { ok: true, report: { added: res.upsertedCount, updated: res.modifiedCount, unchanged: byId.size - res.upsertedCount - res.modifiedCount, failed } }
}
