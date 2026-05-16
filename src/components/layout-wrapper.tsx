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
      {/* Skip to content - accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        跳到主要内容
      </a>
      {!isAdmin && <TopNav />}
      <main id="main-content" role="main" className={!isAdmin ? "pt-14 min-h-screen" : "min-h-screen"}>
        <div className={!isAdmin ? "w-full px-3 py-3 sm:px-5 sm:py-4" : ""}>
          {!isAdmin && <Breadcrumb />}
          {children}
        </div>
      </main>
      {!isAdmin && <MusicPlayer />}
    </BreadcrumbProvider>
  )
}
