// Sample colleges, students and contests for a fresh database.  npm run seed  |  npm run seed -- --reset
import { getClient } from '../src/lib/db.ts'
import { saveTournament, tournaments, teams } from '../src/lib/tournaments.ts'
import { branches, importBranches } from '../src/lib/branches.ts'
import { students, importStudents } from '../src/lib/students.ts'
import { utcToIstInput } from '../src/lib/time.ts'

// This writes 3 invented colleges and 48 invented students. Against a real roster that is not a
// mess to clean up, it is a roster you can no longer trust, so a non-local database has to be asked for twice.
const LOCAL = /\/\/(127\.0\.0\.1|localhost)[:/]/.test(process.env.MONGODB_URI ?? '')
if (!LOCAL && !process.argv.includes('--yes-really')) {
  console.error('MONGODB_URI is not a local database.\nSeeding would add fake colleges and students to it, and --reset would delete the real ones.\nRe-run with:  npm run seed -- --yes-really')
  process.exit(1)
}

if (process.argv.includes('--reset')) {
  await tournaments().deleteMany({})
  await teams().deleteMany({})
  await branches().deleteMany({})
  await students().deleteMany({})
}
// Checked across all three: the dangerous case is a real roster loaded before the first contest exists,
// which a contests-only check would have walked straight past.
const existing = {
  contests: await tournaments().countDocuments(),
  colleges: await branches().countDocuments(),
  students: await students().countDocuments(),
}
const found = Object.entries(existing).filter(([, n]) => n > 0)
if (found.length) {
  console.log(`database already has ${found.map(([k, n]) => `${n} ${k}`).join(', ')} — skipping (use --reset to wipe and reseed)`)
  await getClient().close()
  process.exit(0)
}

// Colleges first: a student needs one, and a contest is opened to a set of them.
const COLLEGES = `name,location
KKH,Hyderabad
Vignana Jyothi,Hyderabad
SR University,Warangal
`
const b = await importBranches(COLLEGES)
console.log(b.ok ? `seeded ${b.report.added} colleges` : b.error)

const NAMES = ['Asha Rao', 'Vikram Nair', 'Priya Menon', 'Rahul Das', 'Sneha Iyer', 'Arjun Reddy', 'Kavya Shetty', 'Imran Khan',
  'Divya Pillai', 'Rohit Verma', 'Neha Gupta', 'Sanjay Kumar', 'Meera Joshi', 'Aditya Rao', 'Pooja Singh', 'Karthik Raj']
const COLLEGE_NAMES = ['KKH', 'Vignana Jyothi', 'SR University']
const roster = ['collegeId,name,phone,branch']
COLLEGE_NAMES.forEach((college, c) => {
  NAMES.forEach((name, i) => {
    const n = c * NAMES.length + i
    roster.push(`2203A5${String(1000 + n).padStart(4, '0')},${name},9${String(100000000 + n).padStart(9, '0')},${college}`)
  })
})
const s = await importStudents(roster.join('\n'))
console.log(s.ok ? `seeded ${s.report.added} students` : s.error)

const at = (days: number, hourIst: number) =>
  `${utcToIstInput(new Date(Date.now() + days * 864e5)).slice(0, 10)}T${String(hourIst).padStart(2, '0')}:00`

const RULES = [
  'Join the room 15 minutes before start.',
  'Every player must be from the registering college.',
  'Screenshots of results may be requested.',
  'Admin decisions are final.',
].join('\n')

const seeds = [
  { game: 'freefire', title: 'Booyah Cup',             mode: 'Squad, Bermuda',          days: 3, hour: 20, prize: '',                branches: ['KKH', 'Vignana Jyothi'] },
  { game: 'bgmi',     title: 'Friday Night Scrims',    mode: 'Squad TPP, Erangel',      days: 2, hour: 21, prize: 'Bragging rights', branches: COLLEGE_NAMES },
  { game: 'codm',     title: 'Search and Destroy Cup', mode: '5v5, Search and Destroy', days: 4, hour: 19, prize: '',                branches: COLLEGE_NAMES },
  { game: 'valorant', title: 'Spike Rush Showdown',    mode: '5v5, single elimination', days: 5, hour: 19, prize: '',                branches: ['SR University'] },
  { game: 'matiks',   title: 'Mental Maths Duel',      mode: '1v1, best of three',      days: 6, hour: 18, prize: '',                branches: COLLEGE_NAMES },
] as const

for (const seed of seeds) {
  const r = await saveTournament(null, {
    game: seed.game, title: seed.title, mode: seed.mode, startsAt: at(seed.days, seed.hour), regClosesAt: '',
    branches: [...seed.branches], requireInGameId: true, rules: RULES, prize: seed.prize, status: 'open',
  })
  console.log(r.ok ? `seeded ${r.slug}` : r.error)
}
await getClient().close()
