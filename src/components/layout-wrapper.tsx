"use client"

import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { MusicPlayer } from "@/components/music-player"
import { TopNav } from "@/components/top-nav"
import { usePathname } from "next/navigation"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith("/admin")

  return (
    <BreadcrumbProvider>
      {/* Skip to content - accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        跳到主要内容
      </a>
      {!isAdminRoute && <TopNav />}
      <main id="main-content" role="main" className={isAdminRoute ? "min-h-screen overflow-x-hidden" : "pt-14 min-h-screen overflow-x-hidden"}>
        {isAdminRoute ? (
          /* 管理后台：全屏无边距，由 admin/layout.tsx 自行处理 */
          children
        ) : (
          /* 前台页面：居中容器，与顶部导航栏左右边缘对齐 */
          <div className="mx-auto w-full max-w-[1300px] px-3 py-3 sm:px-5 sm:py-4 lg:ml-[max(calc((100vw-1240px)/2),0px)] lg:max-w-[1300px] lg:px-6 min-w-0">
            <Breadcrumb />
            {children}
          </div>
        )}
      </main>
      {!isAdminRoute && <MusicPlayer />}
    </BreadcrumbProvider>
  )
}
