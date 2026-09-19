import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { getClient, db } from '../src/lib/db.ts'
import { saveBranch } from '../src/lib/branches.ts'
import { saveStudent } from '../src/lib/students.ts'
import { auth, setPassword } from '../src/lib/auth.ts'

const signIn = (email: string, password: string) => auth.api.signInEmail({ body: { email, password } }).then(() => true, () => false)

before(async () => { assert.match(db.databaseName, /test/); await db.dropDatabase() })
after(() => getClient().close())

test('an admin sets a player a new password: the new one works, the old one and every session do not', async () => {
  // the first account ever is the admin; the second has to be on the roster
  const admin = await auth.api.signUpEmail({ body: { name: 'Boss', email: 'boss@t.dev', password: 'boss-pass-1', phone: '9000000001', collegeId: 'ADMIN001' } })
  await saveBranch({ name: 'KKH', location: 'Hyderabad' })
  await saveStudent({ collegeId: '2203A51000', name: 'Asha', phone: '9000000002', branch: 'KKH' })
  const asha = await auth.api.signUpEmail({ body: { name: 'Asha', email: 'asha@t.dev', password: 'forgotten-1', phone: '9000000002', collegeId: '2203A51000' } })
  assert.equal(await db.collection('session').countDocuments(), 2) // sign-up signs in

  assert.deepEqual(await setPassword('2203a51000', 'brand-new-1', admin.user.id), { ok: true, name: 'Asha', email: 'asha@t.dev' }) // by college ID, any case
  assert.equal(await signIn('asha@t.dev', 'brand-new-1'), true)
  assert.equal(await signIn('asha@t.dev', 'forgotten-1'), false)
  const ashaId = (await db.collection('user').findOne({ email: asha.user.email }))!._id
  assert.equal(await db.collection('session').countDocuments({ userId: ashaId }), 1) // the sign-up session is gone; only the sign-in above

  assert.deepEqual(await setPassword(' ASHA@t.dev ', 'brand-new-2', admin.user.id), { ok: true, name: 'Asha', email: 'asha@t.dev' }) // by email
  assert.equal(await signIn('asha@t.dev', 'brand-new-2'), true)
})

test('nobody is changed by a miss or by an admin on their own account', async () => {
  const boss = (await db.collection('user').findOne({ email: 'boss@t.dev' }))!
  assert.deepEqual(await setPassword('nobody@t.dev', 'whatever-1', String(boss._id)), { ok: false, error: 'not_found' })
  assert.deepEqual(await setPassword('boss@t.dev', 'whatever-1', String(boss._id)), { ok: false, error: 'self' })
  assert.equal(await signIn('boss@t.dev', 'boss-pass-1'), true)
})
