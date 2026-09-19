'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { studentInput, collegeIdSchema } from '@/lib/schemas'
import { importStudents, saveStudent, deleteStudent } from '@/lib/students'
import type { ImportState } from '@/components/ImportForm'

export type StudentState = { ok: false; error: string; values: Record<string, string> } | { ok: true; message: string } | null

const MAX_BYTES = 2_000_000

export async function saveStudentAction(_prev: StudentState, form: FormData): Promise<StudentState> {
  await requireAdmin()
  const values = Object.fromEntries([...form].map(([k, v]) => [k, String(v)]))
  const parsed = studentInput.safeParse(values)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, values }
  const res = await saveStudent(parsed.data)
  if (!res.ok) return { ok: false, error: res.error, values }
  revalidatePath('/admin/students')
  return { ok: true, message: `${parsed.data.name} ${res.added ? 'added to' : 'updated on'} the student list.` }
}

export async function deleteStudentAction(form: FormData) {
  await requireAdmin()
  const id = collegeIdSchema.safeParse(form.get('collegeId'))
  if (id.success) await deleteStudent(id.data)
  revalidatePath('/admin/students')
}

export async function importStudentsAction(_prev: ImportState, form: FormData): Promise<ImportState> {
  await requireAdmin()
  const file = form.get('file')
  if (!(file instanceof File) || !file.size) return { ok: false, error: 'Pick a CSV file first.' }
  if (file.size > MAX_BYTES) return { ok: false, error: `That file is ${Math.round(file.size / 1e6)} MB. Split it: the limit is 2 MB, which is roughly 5000 students.` }
  const res = await importStudents(await file.text())
  if (!res.ok) return res
  revalidatePath('/admin/students')
  return { ok: true, report: res.report }
}
