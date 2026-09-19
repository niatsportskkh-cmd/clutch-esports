const cell = (v: unknown) => {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // spreadsheet formula injection guard
  return `"${s.replace(/"/g, '""')}"`
}

export const toCsv = (rows: unknown[][]) => rows.map(r => r.map(cell).join(',')).join('\r\n')

/** RFC 4180 as far as a spreadsheet export goes: quoted fields may hold commas, newlines and doubled quotes. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^\uFEFF/, '') // Excel writes a BOM
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c !== '"') field += c
      else if (s[i + 1] === '"') { field += '"'; i++ } // "" is one literal quote
      else quoted = false
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

export type Table = { ok: true; rows: Record<string, string>[] } | { ok: false; error: string }

/** A spreadsheet export: header row first, columns in any order, names matched ignoring case and punctuation. */
export function readTable(csv: string, columns: readonly string[], maxRows: number): Table {
  const raw = parseCsv(csv).filter(r => r.some(c => c.trim()))
  if (!raw.length) return { ok: false, error: 'That file is empty.' }
  if (raw.length - 1 > maxRows) return { ok: false, error: `That is ${raw.length - 1} rows. Split the file into chunks of ${maxRows}.` }

  const norm = (h: string) => h.trim().toLowerCase().replace(/[^a-z]/g, '')
  const head = raw[0].map(norm)
  const at = columns.map(c => head.indexOf(norm(c)))
  if (at.some(i => i < 0)) {
    return { ok: false, error: `The first row has to name the columns. Missing: ${columns.filter((_, i) => at[i] < 0).join(', ')}. Found: ${raw[0].join(', ') || '(nothing)'}` }
  }
  return { ok: true, rows: raw.slice(1).map(r => Object.fromEntries(columns.map((c, i) => [c, r[at[i]] ?? '']))) }
}

export type ImportReport = { added: number; updated: number; unchanged: number; failed: { line: number; reason: string }[] }
export type ImportResult = { ok: true; report: ImportReport } | { ok: false; error: string }
