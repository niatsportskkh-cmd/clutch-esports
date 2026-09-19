import type { Metadata, Viewport } from 'next'
import { Teko, Geist, Geist_Mono } from 'next/font/google'
import SceneCanvas from '@/components/scene/SceneCanvas'
import { Nav } from '@/components/Nav'
import { INTRO_SCRIPT, IntroLoader } from '@/components/IntroLoader'
import './globals.css'

const teko = Teko({ variable: '--font-teko', subsets: ['latin'], weight: ['500', '600', '700'] })
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Clutch by NIAT: free esports matches', template: '%s | Clutch by NIAT' },
  description: 'Free inter-college esports contests in Free Fire MAX, BGMI, COD Mobile, Valorant and Matiks.',
}
export const viewport: Viewport = { themeColor: '#050505', colorScheme: 'dark' }

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // suppressHydrationWarning: the head script below sets data-intro on <html> before React hydrates
    <html lang="en" className={`${teko.variable} ${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
      {/* a plain inline script, not next/script: it has to run before the first paint, or the loader would flash */}
      <head><script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} /></head>
      <body className="flex min-h-[100dvh] flex-col">
        <IntroLoader />
        {/* mounted once, never remounted: navigation morphs the swarm instead of reloading it */}
        <SceneCanvas />
        <Nav />
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 pt-24 pb-24 sm:px-8 sm:pt-32">{children}</main>
        <footer className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 pb-10 text-sm text-muted sm:px-8">
          <p>Clutch by NIAT. Free-entry esports matches.</p>
          <p>Entry is always free. No payments are taken on this site.</p>
          <p className="w-full text-xs leading-relaxed text-muted/70">
            Free Fire, BGMI, Call of Duty, VALORANT and Matiks are trademarks of Garena, KRAFTON, Activision, Riot Games and Matiks, whose art appears here.
            Clutch is an independent college event and is not endorsed by or affiliated with any of them. Clutch was created under Riot Games&apos; &ldquo;Legal Jibber Jabber&rdquo; policy using assets owned by Riot Games.
          </p>
        </footer>
      </body>
    </html>
  )
}
