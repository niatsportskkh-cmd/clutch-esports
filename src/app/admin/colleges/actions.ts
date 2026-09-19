'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { branchInput } from '@/lib/schemas'
import { importBranches, saveBranch, editBranch, deleteBranch } from '@/lib/branches'
import type { ImportState } from '@/components/ImportForm'

export type BranchState = { ok: false; error: string; values: Record<string, string> } | { ok: true; message: string } | null

const MAX_BYTES = 200_000

export async function saveBranchAction(_prev: BranchState, form: FormData): Promise<BranchState> {
  await requireAdmin()
  const values = Object.fromEntries([...form].map(([k, v]) => [k, String(v)]))
  const parsed = branchInput.safeParse(values)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, values }
  if (values.original) {
    const res = await editBranch(values.original, parsed.data)
    if (!res.ok) return { ok: false, error: res.error, values }
    revalidatePath('/', 'layout')
    return { ok: true, message: `${values.original === parsed.data.name ? parsed.data.name : `${values.original} is now ${parsed.data.name}`}, in ${parsed.data.location}. Its students came with it.` }
  }
  const { added } = await saveBranch(parsed.data)
  revalidatePath('/', 'layout') // the college list feeds the roster form and every contest form
  return { ok: true, message: `${parsed.data.name} ${added ? 'added' : 'updated'}.` }
}

export async function deleteBranchAction(_prev: BranchState, form: FormData): Promise<BranchState> {
  await requireAdmin()
  const name = String(form.get('name') ?? '')
  const res = await deleteBranch(name)
  if (!res.ok) return { ok: false, error: res.error, values: {} }
  revalidatePath('/', 'layout')
  return { ok: true, message: `${name} removed.` }
}

export async function importBranchesAction(_prev: ImportState, form: FormData): Promise<ImportState> {
  await requireAdmin()
  const file = form.get('file')
  if (!(file instanceof File) || !file.size) return { ok: false, error: 'Pick a CSV file first.' }
  if (file.size > MAX_BYTES) return { ok: false, error: 'That file is too big for a college list. The limit is 500 rows.' }
  const res = await importBranches(await file.text())
  if (res.ok) revalidatePath('/', 'layout')
  return res
}
