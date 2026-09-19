import { test } from 'node:test'
import assert from 'node:assert/strict'
import { istToUtc, utcToIstInput, formatIst } from '../src/lib/time.ts'
import { toCsv } from '../src/lib/csv.ts'
import { safeNext } from '../src/lib/safe-next.ts'

test('IST input converts to UTC and back', () => {
  const d = istToUtc('2026-09-20T20:00')
  assert.equal(d.toISOString(), '2026-09-20T14:30:00.000Z')
  assert.equal(utcToIstInput(d), '2026-09-20T20:00')
  assert.match(formatIst(d), /8:00\s?pm IST$/i)
})

test('csv escapes quotes and defuses formulas', () => {
  assert.equal(toCsv([['a"b', '=SUM(A1)', 7, null]]), `"a""b","'=SUM(A1)","7",""`)
  assert.equal(toCsv([['x'], ['y']]), '"x"\r\n"y"')
})

test('safeNext only allows same-site paths', () => {
  assert.equal(safeNext('/games/x/register'), '/games/x/register')
  for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '', null, undefined]) {
    assert.equal(safeNext(bad), '/')
  }
})
