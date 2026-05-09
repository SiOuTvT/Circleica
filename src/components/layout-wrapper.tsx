"use client"

import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { MusicPlayer } from "@/components/music-player"
import { TopNav } from "@/components/top-nav"
import { usePathname } from "next/navigation"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")

  return (
    <BreadcrumbProvider>
      {!isAdmin && <TopNav />}
      <main className={!isAdmin ? "pt-14 min-h-screen" : "min-h-screen"}>
          <div className={!isAdmin ? "mx-auto max-w-[1300px] px-3 py-3 sm:px-6 sm:py-5 lg:ml-[max(calc((100vw-1240px)/2),0px)]" : ""}>
          {!isAdmin && <Breadcrumb />}
          {children}
        </div>
      </main>
      {!isAdmin && <MusicPlayer />}
    </BreadcrumbProvider>
  )
}
