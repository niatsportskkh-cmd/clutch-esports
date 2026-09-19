import { requireAdmin } from '@/lib/admin'
import { SceneTarget } from '@/components/scene/SceneTarget'

export const metadata = { title: 'Admin', robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin() // anyone without the admin role gets a 404: the panel's existence is not advertised
  return <><SceneTarget shape="field" hue={null} />{children}</>
}
