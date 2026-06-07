"use client"

import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { MusicPlayer } from "@/components/music-player"
import { NavSidebar } from "@/components/nav-sidebar"
import { TopNav } from "@/components/top-nav"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useOnlineStatus()
  useKeyboardShortcuts()
  const isAdminRoute = pathname.startsWith("/admin")
  const isFullscreenRoute = pathname === "/login" || pathname === "/register"

  // 侧边栏状态
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [navMobileOpen, setNavMobileOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [forumOpen, setForumOpen] = useState(false)
  const [contentOffset, setContentOffset] = useState(0)

  // 只在客户端初始化桌面状态
  useEffect(() => {
    const desktop = window.innerWidth >= 1024
    setIsDesktop(desktop)
    setForumOpen(desktop)
  }, [])

  // 只开一边时那一边变大
  const leftExpanded = !navCollapsed && !forumOpen
  const rightExpanded = navCollapsed && forumOpen

  // 计算内容区偏移（居中 + 往侧边栏靠）
  const LEFT_NORMAL = 220, LEFT_EXPANDED = 260, LEFT_COLLAPSED = 60
  const RIGHT_NORMAL = 280, RIGHT_EXPANDED = 360

  useEffect(() => {
    if (!isDesktop) { setContentOffset(0); return }
    const sw = window.innerWidth
    const lw = navCollapsed ? LEFT_COLLAPSED : (leftExpanded ? LEFT_EXPANDED : LEFT_NORMAL)
    const rw = forumOpen ? (rightExpanded ? RIGHT_EXPANDED : RIGHT_NORMAL) : 0
    const available = sw - lw - rw
    const centerOfAvailable = lw + available / 2
    const centerOfPage = sw / 2
    let offset = centerOfAvailable - centerOfPage
    // 往侧边栏靠一点
    if (navCollapsed && forumOpen) offset += rw / 5
    else if (!navCollapsed && !forumOpen) offset -= lw / 5
    setContentOffset(offset)
  }, [isDesktop, navCollapsed, forumOpen, leftExpanded, rightExpanded])

  const toggleNav = useCallback(() => {
    if (window.innerWidth < 1024) {
      setNavMobileOpen(v => !v)
    } else {
      setNavCollapsed(v => !v)
    }
  }, [])

  const toggleForum = useCallback(() => {
    setForumOpen(v => !v)
  }, [])

  return (
    <BreadcrumbProvider>
      {/* Skip to content - accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        跳到主要内容
      </a>

      {/* 左侧导航栏 - 独立全高，不依赖顶栏 */}
      {!isAdminRoute && !isFullscreenRoute && (
        <NavSidebar
          collapsed={navCollapsed}
          expanded={leftExpanded}
          onToggle={toggleNav}
          mobileOpen={navMobileOpen}
          onMobileToggle={() => setNavMobileOpen(v => !v)}
        />
      )}

      <main id="main-content" role="main" className={(isAdminRoute || isFullscreenRoute) ? "min-h-screen overflow-x-clip" : "min-h-screen overflow-x-clip"}>
        {isAdminRoute ? (
          children
        ) : isFullscreenRoute ? (
          children
        ) : (
          /* 前台页面：顶栏在内容区内，悬浮卡片样式 */
          <div
            className="min-h-screen transition-transform duration-300 ease-out"
            style={{
              transform: isDesktop ? `translateX(${contentOffset}px)` : undefined,
            }}
          >
            {/* 悬浮卡片导航栏 */}
            <div className="sticky top-0 z-30 px-4 pt-3">
              <TopNav
                navCollapsed={navCollapsed}
                onToggleNav={toggleNav}
                forumOpen={forumOpen}
                forumExpanded={rightExpanded}
                onToggleForum={toggleForum}
              />
            </div>
            <div className="flex justify-center px-4 pb-8">
              <div className="w-full max-w-[1100px] py-4">
                <Breadcrumb />
                {children}
              </div>
            </div>
            {/* Footer 也在内容区内 */}
            <footer role="contentinfo" className="border-t border-border bg-muted/30 py-6 text-center text-xs text-muted-foreground">
              <div className="mx-auto max-w-[1100px] px-4">
                <p>同人游戏站 · 资源大厅</p>
                <p className="mt-1">本站资源均来自互联网，仅供学习交流使用</p>
                <div className="mt-3 border-t border-border/50 pt-3 flex items-center justify-center gap-4">
                  <a href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">关于我们</a>
                  <a href="/rules" className="text-xs text-muted-foreground hover:text-foreground transition-colors">社区规范</a>
                  <a href="/contact" className="text-xs text-muted-foreground hover:text-foreground transition-colors">联系我们</a>
                </div>
              </div>
            </footer>
          </div>
        )}
      </main>
      <MusicPlayer />
    </BreadcrumbProvider>
  )
}
