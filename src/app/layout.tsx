import { MusicPlayer } from "@/components/music-player"
import { Providers } from "@/components/providers"
import { TopNav } from "@/components/top-nav"
import type { Metadata } from "next"
import { headers } from "next/headers"
import "./globals.css"

export const metadata: Metadata = {
  title: "同人游戏站 · 资源大厅",
  description: "东方、月姬、Fate 等同人游戏资源一站式体验",
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""
  const isAdmin = pathname.startsWith("/admin")

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          {!isAdmin && <TopNav />}
          <main className={!isAdmin ? "pt-14 min-h-screen" : "min-h-screen"}>
            <div className={!isAdmin ? "mx-auto max-w-[1300px] px-6 py-5 lg:ml-[max(calc((100vw-1240px)/2),0px)]" : ""}>
              {children}
            </div>
          </main>
          {!isAdmin && <MusicPlayer />}
        </Providers>
      </body>
    </html>
  )
}
