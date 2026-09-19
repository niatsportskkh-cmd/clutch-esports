import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { getClient, db } from '../src/lib/db.ts'
import { saveBranch } from '../src/lib/branches.ts'
import { saveStudent } from '../src/lib/students.ts'
import { signupGate } from '../src/lib/users.ts'

const users = () => db.collection('user')

before(async () => { assert.match(db.databaseName, /test/); await db.dropDatabase() })
after(() => getClient().close())

test('bad fields are refused even on an empty database', async () => {
  assert.deepEqual(await signupGate({ phone: '123', collegeId: 'ADMIN001' }), { ok: false, message: 'Enter a valid NIAT registered number' })
  assert.deepEqual(await signupGate({ phone: '9876543210', collegeId: '!' }), { ok: false, message: 'Enter a valid NIAT ID' })
})

test('the first account ever becomes admin without being on the roster', async () => {
  assert.equal(await db.collection('students').countDocuments(), 0) // nobody on the roster at all
  assert.deepEqual(
    await signupGate({ phone: '+91 98765 43210', collegeId: 'admin001' }),
    { ok: true, fields: { phone: '9876543210', collegeId: 'ADMIN001', role: 'admin' } }, // normalised, no branch
  )
})

test('once one account exists, the next sign-up needs the roster and is never admin', async () => {
  await users().insertOne({ _id: new ObjectId(), name: 'First', email: 'first@t.dev', phone: '9876543210', collegeId: 'ADMIN001', role: 'admin' })

  const outsider = await signupGate({ phone: '9000000001', collegeId: 'NOTLISTED' })
  assert.equal(outsider.ok, false)
  assert.match((outsider as { message: string }).message, /not on the student list/)

  await saveBranch({ name: 'KKH', location: 'Hyderabad' })
  await saveStudent({ collegeId: '2203A51000', name: 'Asha', phone: '9000000002', branch: 'KKH' })
  assert.deepEqual(
    await signupGate({ phone: '9000000002', collegeId: '2203a51000' }),
    { ok: true, fields: { phone: '9000000002', collegeId: '2203A51000', branch: 'KKH' } }, // no role: a plain user
  )
})

test('the roster match needs both halves, and one college ID gets one account', async () => {
  assert.equal((await signupGate({ phone: '9999999999', collegeId: '2203A51000' })).ok, false) // right ID, wrong number
  await users().insertOne({ _id: new ObjectId(), name: 'Asha', email: 'asha@t.dev', phone: '9000000002', collegeId: '2203A51000' })
  const again = await signupGate({ phone: '9000000002', collegeId: '2203A51000' })
  assert.equal(again.ok, false)
  assert.match((again as { message: string }).message, /already exists for this NIAT ID/)
  assert.doesNotMatch((again as { message: string }).message, /reset/)
})
