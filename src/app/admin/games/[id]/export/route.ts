import { requireAdmin } from '@/lib/admin'
import { toCsv } from '@/lib/csv'
import { formatIst } from '@/lib/time'
import { getById, listTeamsFor } from '@/lib/tournaments'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const t = await getById((await params).id)
  if (!t) return new Response('Not found', { status: 404 })
  const regs = await listTeamsFor(t._id)

  const perPlayer = t.requireInGameId ? ['Player', 'NIAT ID', 'Mobile', 'In-game ID'] : ['Player', 'NIAT ID', 'Mobile']
  const head = ['#', 'Code', 'Team', 'College', 'Location', 'Captain', 'Captain mobile', 'Captain email', 'Registered',
    ...Array.from({ length: t.teamSize }, (_, i) => perPlayer.map(c => `${c} ${i + 1}`)).flat()]
  const rows = regs.map((r, i) => {
    const captain = r.players.find(p => p.collegeId === r.captainCollegeId)
    return [i + 1, r.code, r.teamName, r.branch, r.location, captain?.name ?? '', r.phone, r.email, formatIst(r.createdAt),
      ...r.players.flatMap(p => (t.requireInGameId ? [p.name, p.collegeId, p.phone, p.inGameId] : [p.name, p.collegeId, p.phone]))]
  })
  // BOM so Excel reads UTF-8 names correctly
  return new Response('﻿' + toCsv([head, ...rows]), {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${t.slug}.csv"`, 'cache-control': 'no-store' },
  })
}
