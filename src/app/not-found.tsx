import { Button } from '@/components/Button'
import { SceneTarget } from '@/components/scene/SceneTarget'

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-start justify-center gap-6">
      <SceneTarget shape="field" hue={null} />
      <h1 className="display text-5xl sm:text-7xl">Nothing here</h1>
      <p className="max-w-[48ch] text-lg text-muted">That page does not exist, or the contest was removed. Open contests are on the Games page.</p>
      <Button href="/games">Browse contests</Button>
    </div>
  )
}
