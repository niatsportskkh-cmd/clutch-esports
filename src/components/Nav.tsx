import Image from 'next/image'
import Link from 'next/link'
import { getUser } from '@/lib/auth'
import { isAdmin } from '@/lib/users'
import { SignOutButton } from './SignOutButton'

const item = 'whitespace-nowrap rounded-full px-2.5 py-2 sm:px-3 text-sm font-medium text-muted transition-colors duration-300 hover:bg-white/[0.07] hover:text-text'

/** A floating pill, detached from the top edge. One row at every width: no hamburger needed for four links. */
export async function Nav() {
  const user = await getUser()
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3 sm:pt-5">
      <nav aria-label="Main" className="pointer-events-auto flex h-14 w-full max-w-3xl items-center gap-1 rounded-full bg-ink/85 pr-2 pl-5 ring-1 ring-white/10 backdrop-blur-xl">
        {/* "Clutch by NIAT" on every page: the wordmark, then NIAT's shield. Read aloud as "Clutch by NIAT". */}
        <Link href="/" className="mr-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Image src="/logo.png" alt="Clutch" width={480} height={177} priority className="h-6 w-auto sm:h-8" />
          <span className="text-xs font-medium text-muted sm:text-sm">by</span>
          <Image src="/brand/niat-shield.webp" alt="NIAT" width={302} height={381} className="h-7 w-auto sm:h-9" />
        </Link>
        <Link href="/games" className={item}>Games</Link>
        {user ? (
          <>
            <Link href="/me" className={item}>My games</Link>
            {isAdmin(user) && <Link href="/admin" className={item}>Admin</Link>}
            <SignOutButton className={`${item} max-sm:hidden`} />
          </>
        ) : (
          <>
            <Link href="/login" className={item}>Log in</Link>
            <Link href="/signup" className="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink transition-transform duration-500 ease-spring active:scale-[0.97]">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  )
}
