"use client"

import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { MusicPlayer } from "@/components/music-player"
import { TopNav } from "@/components/top-nav"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { usePathname } from "next/navigation"

export function LayoutWrapper({ children, isAdmin }: { children: React.ReactNode; isAdmin?: boolean }) {
  const pathname = usePathname()
  useOnlineStatus()
  useKeyboardShortcuts()
  const isAdminRoute = pathname.startsWith("/admin")
  const isFullscreenRoute = pathname === "/login" || pathname === "/register"

  return (
    <BreadcrumbProvider>
      {/* Skip to content - accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        跳到主要内容
      </a>
      {!isAdminRoute && !isFullscreenRoute && <TopNav />}
      <main id="main-content" role="main" className={(isAdminRoute || isFullscreenRoute) ? "min-h-screen overflow-x-clip" : "pt-14 min-h-screen overflow-x-clip"}>
        {isAdminRoute ? (
          /* 管理后台：全屏无边距，由 admin/layout.tsx 自行处理 */
          children
        ) : isFullscreenRoute ? (
          /* 登录/注册：全屏居中 */
          children
        ) : (
          /* 前台页面：居中容器，与顶部导航栏左右边缘对齐 */
          <div className="mx-auto w-full max-w-[1300px] px-2 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4 lg:ml-[max(calc((100vw-1240px)/2),0px)] lg:max-w-[1300px] lg:px-6 min-w-0">
            <Breadcrumb />
            {children}
          </div>
        )}
      </main>
      {isAdmin && <MusicPlayer />}
    </BreadcrumbProvider>
  )
}
