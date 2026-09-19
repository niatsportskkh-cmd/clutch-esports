import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { ObjectId } from 'mongodb'
import { getClient, db } from '../src/lib/db.ts'
import { isAdmin, setRole, listByRole } from '../src/lib/users.ts'

const users = () => db.collection('user')
async function account(email: string, role?: string) {
  const _id = new ObjectId()
  await users().insertOne({ _id, name: email.split('@')[0], email, phone: '9999999999', ...(role ? { role } : {}) })
  return _id.toHexString()
}

before(async () => { assert.match(db.databaseName, /test/); await db.dropDatabase() })
after(() => getClient().close())

test('isAdmin only accepts the admin role', () => {
  assert.equal(isAdmin({ role: 'admin' }), true)
  assert.equal(isAdmin({ role: 'user' }), false)
  assert.equal(isAdmin({}), false)
  assert.equal(isAdmin(null), false)
})

test('promote, then revoke', async () => {
  const boss = await account('boss@t.dev', 'admin')
  await account('nina@t.dev')

  assert.deepEqual(await setRole('nina@t.dev', 'admin', boss), { ok: true, email: 'nina@t.dev', name: 'nina' })
  assert.deepEqual((await listByRole('admin')).map(a => a.email), ['boss@t.dev', 'nina@t.dev'])

  await setRole('nina@t.dev', 'user', boss)
  assert.deepEqual((await listByRole('admin')).map(a => a.email), ['boss@t.dev'])
})

test('unknown email is rejected, and mixed case still matches', async () => {
  const boss = await account('boss2@t.dev', 'admin')
  await account('mix@t.dev')
  assert.deepEqual(await setRole('ghost@t.dev', 'admin', boss), { ok: false, error: 'not_found' })
  assert.equal((await setRole('  MIX@T.dev ', 'admin', boss)).ok, true)
})

test('nobody changes their own role: the last admin cannot lock themselves out', async () => {
  const boss = await account('solo@t.dev', 'admin')
  assert.deepEqual(await setRole('solo@t.dev', 'user', boss), { ok: false, error: 'self' })
  assert.equal((await users().findOne({ email: 'solo@t.dev' }))!.role, 'admin')
})
