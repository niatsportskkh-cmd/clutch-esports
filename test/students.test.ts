import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { getClient, db } from '../src/lib/db.ts'
import { parseCsv } from '../src/lib/csv.ts'
import { findStudent, importStudents, listStudents, saveStudent, students } from '../src/lib/students.ts'
import { saveBranch, editBranch, getBranch } from '../src/lib/branches.ts'

before(async () => {
  assert.match(db.databaseName, /test/)
  await db.dropDatabase()
  // a student needs a college that exists: without one they would have no location
  for (const name of ['KKH', 'Vignana Jyothi']) await saveBranch({ name, location: 'Hyderabad' })
})
after(() => getClient().close())

test('parseCsv keeps commas, newlines and doubled quotes inside quoted fields', () => {
  assert.deepEqual(parseCsv('a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']])
  assert.deepEqual(parseCsv('"x,y","he said ""hi""","two\nlines"'), [['x,y', 'he said "hi"', 'two\nlines']])
  assert.deepEqual(parseCsv('﻿a\nb'), [['a'], ['b']]) // Excel's BOM
})

test('import accepts any column order and reports bad rows by spreadsheet line', async () => {
  const res = await importStudents(
    'Name,Branch,Phone,College ID\n' +
    'Asha,KKH,98765 43210,2203a51234\n' +
    'Bad,KKH,123,2203A51235\n' +                      // phone too short -> line 3
    'Ghost,Nowhere College,9000000009,2203A51237\n' + // college not on the list -> line 4
    'Cyrus,Vignana Jyothi,+91 9000000002,2203A51236\n',
  )
  assert.ok(res.ok)
  assert.equal(res.report.added, 2)
  assert.deepEqual(res.report.failed, [
    { line: 3, reason: 'Enter a valid phone number' },
    { line: 4, reason: 'Nowhere College is not a college on the list' },
  ])

  const asha = (await students().findOne({ collegeId: '2203A51234' }))!
  assert.equal(asha.collegeId, '2203A51234')   // uppercased
  assert.equal(asha.phone, '9876543210')       // spaces gone
  assert.equal((await students().findOne({ collegeId: '2203A51236' }))!.phone, '9000000002') // +91 stripped
})

test('re-importing a corrected sheet updates instead of duplicating', async () => {
  const again = await importStudents('collegeId,name,phone,branch\n2203A51234,Asha Rao,9876543210,Vignana Jyothi\n')
  assert.ok(again.ok)
  assert.deepEqual([again.report.added, again.report.updated], [0, 1])
  assert.equal(await students().countDocuments({ collegeId: '2203A51234' }), 1)
  assert.equal((await students().findOne({ collegeId: '2203A51234' }))!.branch, 'Vignana Jyothi')
})

test('a missing column is refused before anything is written', async () => {
  const before = await students().countDocuments()
  const res = await importStudents('name,phone\nAsha,9876543210\n')
  assert.equal(res.ok, false)
  assert.match((res as { error: string }).error, /Missing: collegeId, branch/)
  assert.equal(await students().countDocuments(), before)
})

test('the sign-up gate needs both halves of the same row', async () => {
  assert.equal((await saveStudent({ collegeId: '2203A51299', name: 'Dev', phone: '9000000099', branch: 'Nowhere' })).ok, false)
  assert.equal((await saveStudent({ collegeId: '2203A51299', name: 'Dev', phone: '9000000099', branch: 'KKH' })).ok, true)
  assert.ok(await findStudent('2203A51299', '9000000099'))
  assert.equal(await findStudent('2203A51299', '9876543210'), null) // right ID, someone else's number
  assert.equal(await findStudent('2203A51298', '9000000099'), null) // right number, someone else's ID
})

test('search is filtered, paged, and safe against regex metacharacters', async () => {
  assert.deepEqual((await listStudents({ q: 'asha' })).rows.map(r => r.collegeId), ['2203A51234'])
  assert.deepEqual((await listStudents({ q: '51236' })).rows.map(r => r.name), ['Cyrus'])
  assert.deepEqual((await listStudents({ branch: 'Vignana Jyothi' })).rows.map(r => r.name), ['Asha Rao', 'Cyrus'])
  assert.equal((await listStudents({ q: 'a(b' })).total, 0) // would throw if the term reached Mongo unescaped
  const paged = await listStudents({ perPage: 2 })
  assert.equal(paged.rows.length, 2)
  assert.equal(paged.pages, 2)
})

test('editing a college moves its students, accounts, contests and teams to the new name', async () => {
  await saveBranch({ name: 'Old Name', location: 'Hyderabad' })
  await saveStudent({ collegeId: '2203A59001', name: 'Mover', phone: '9000009001', branch: 'Old Name' })
  await db.collection('user').insertOne({ email: 'mover@x.in', collegeId: '2203A59001', branch: 'Old Name' })
  await db.collection('tournaments').insertOne({ title: 'Cup', branches: ['KKH', 'Old Name'] })
  await db.collection('teams').insertOne({ teamName: 'Movers', branch: 'Old Name', location: 'Hyderabad' })

  assert.equal((await editBranch('Old Name', { name: 'KKH', location: 'Hyderabad' })).ok, false) // no silent merge
  assert.ok((await editBranch('Old Name', { name: 'New Name', location: 'Warangal' })).ok)

  assert.equal(await getBranch('Old Name'), null)
  assert.equal((await getBranch('New Name'))!.location, 'Warangal')
  assert.equal((await students().findOne({ collegeId: '2203A59001' }))!.branch, 'New Name')
  assert.equal((await db.collection('user').findOne({ email: 'mover@x.in' }))!.branch, 'New Name')
  assert.deepEqual((await db.collection('tournaments').findOne({ title: 'Cup' }))!.branches, ['KKH', 'New Name'])
  assert.deepEqual(await db.collection('teams').findOne({ teamName: 'Movers' }, { projection: { _id: 0, branch: 1, location: 1 } }), { branch: 'New Name', location: 'Warangal' })
})
