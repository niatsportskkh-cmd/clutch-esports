import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI ?? '' // `?? ''` keeps it a plain string for the closure below
if (!uri) throw new Error('Missing env var MONGODB_URI')

// cached on globalThis so dev HMR and warm Vercel lambdas reuse one pool
const g = globalThis as unknown as { _mongo?: MongoClient; _indexes?: Promise<void> }

// A closed client never reopens — the driver drops its topology and latches `hasBeenClosed` on for good
// (mongo_client.js:334), so every later operation throws "Topology is closed" or "Client must be connected".
// Next's dev server tears its runtime down without our code ever calling close(), and the cache above then
// hands that dead client to every request until the process restarts. So check before handing it out.
// Both fields are driver internals; optional chaining keeps a driver change from throwing here.
const dead = (c: MongoClient) => {
  const inner = c as unknown as { topology?: { isDestroyed(): boolean }; s?: { hasBeenClosed?: boolean } }
  return inner.topology ? inner.topology.isDestroyed() : inner.s?.hasBeenClosed === true
}

export function getClient() {
  if (!g._mongo || dead(g._mongo)) {
    g._mongo = new MongoClient(uri)
    g._indexes = undefined // a new pool has not run them yet
  }
  return g._mongo
}

// A stable reference callers can hold — including better-auth's adapter, which wants a Db up front —
// that forwards to whichever client is alive at call time. The adapter only ever reads `.collection`.
export const db: Db = new Proxy({} as Db, {
  get(_t, prop) {
    const live = getClient().db(process.env.MONGODB_DB)
    const v = Reflect.get(live, prop)
    return typeof v === 'function' ? v.bind(live) : v
  },
})

export const ensureIndexes = () =>
  (g._indexes ??= Promise.all([
    db.collection('tournaments').createIndex({ slug: 1 }, { unique: true }),
    // Unique across documents on a multikey field: one person, by college ID, on one confirmed team per contest.
    // This is the race backstop for the friendlier check in registerTeam.
    db.collection('teams').createIndex(
      { tournamentId: 1, 'players.collegeId': 1 },
      { unique: true, partialFilterExpression: { status: 'confirmed' } },
    ),
    db.collection('teams').createIndex({ tournamentId: 1, createdAt: 1 }),
    db.collection('teams').createIndex({ location: 1, branch: 1, createdAt: -1 }),
    db.collection('students').createIndex({ collegeId: 1 }, { unique: true }),
    db.collection('students').createIndex({ branch: 1, name: 1 }),
    db.collection('branches').createIndex({ name: 1 }, { unique: true }),
    // sparse: accounts created before the roster existed have no college ID, and they must not all collide on null
    db.collection('user').createIndex({ collegeId: 1 }, { unique: true, sparse: true }),
  ]).then(() => undefined))
