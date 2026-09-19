// The first admin, before anyone can promote from the panel.  npm run promote you@college.edu  |  ... -- --revoke
import { getClient, db } from '../src/lib/db.ts'

const email = process.argv[2]?.trim().toLowerCase()
const role = process.argv.includes('--revoke') ? 'user' : 'admin'
if (!email || email.startsWith('--')) {
  console.error('usage: npm run promote <email> [-- --revoke]')
  process.exit(1)
}

const { matchedCount } = await db.collection('user').updateOne({ email }, { $set: { role, roleSetAt: new Date() } })
console.log(matchedCount ? `${email} is now ${role}` : `no account with ${email} yet — they have to sign up first`)
await getClient().close()
