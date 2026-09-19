import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { safeNext } from '@/lib/safe-next'
import { SceneTarget } from '@/components/scene/SceneTarget'
import { AuthForm } from '../AuthForm'
import { BackLink } from '@/components/BackLink'

export const metadata = { title: 'Sign up' }

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  if (await getUser()) redirect(safeNext(next))
  return (
    <>
      <SceneTarget shape="field" hue={null} />
      <div className="mx-auto w-full max-w-md"><BackLink href="/">Home</BackLink></div>
      <AuthForm mode="signup" next={next} />
    </>
  )
}
