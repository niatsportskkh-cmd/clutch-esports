import Image from 'next/image'
import { ART } from '@/lib/game-art'
import { isGame } from '@/lib/games'

/** The game's official app icon. A retired game (not one of the five) gets a plain tile instead of a crash. */
export function GameIcon({ game, size = 40, className = '' }: { game: string; size?: number; className?: string }) {
  const cls = `shrink-0 rounded-[22%] ${className}`
  if (!isGame(game)) return <span aria-hidden className={`${cls} inline-block bg-white/10`} style={{ width: size, height: size }} />
  return <Image src={ART[game].icon} alt="" width={size} height={size} className={cls} />
}
