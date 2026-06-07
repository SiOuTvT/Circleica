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
  const [forumOpen, setForumOpen] = useState(typeof window !== "undefined" && window.innerWidth >= 1024)

  // 计算内容区偏移量和侧边栏状态
  const [contentOffset, setContentOffset] = useState(0)
  const [leftExpanded, setLeftExpanded] = useState(false)
  const [rightExpanded, setRightExpanded] = useState(false)

  const LEFT_NORMAL = 220, LEFT_EXPANDED = 260
  const RIGHT_NORMAL = 280, RIGHT_EXPANDED = 360

  const updateLayout = useCallback(() => {
    if (isAdminRoute || isFullscreenRoute) return
    const sw = window.innerWidth

    // 只开一边时，那一边变大
    const shouldExpandLeft = !navCollapsed && !forumOpen
    const shouldExpandRight = navCollapsed && forumOpen
    setLeftExpanded(shouldExpandLeft)
    setRightExpanded(shouldExpandRight)

    const lw = navCollapsed ? 0 : (shouldExpandLeft ? LEFT_EXPANDED : LEFT_NORMAL)
    const rw = forumOpen ? (shouldExpandRight ? RIGHT_EXPANDED : RIGHT_NORMAL) : 0

    // 内容在可用空间内居中
    const available = sw - lw - rw
    const centerOfAvailable = lw + available / 2
    const centerOfPage = sw / 2
    let offset = centerOfAvailable - centerOfPage

    // 只开一边时，内容往那边靠
    if (navCollapsed && forumOpen) {
      offset += rw / 2
    } else if (!navCollapsed && forumOpen) {
      offset -= lw / 2
    }

    setContentOffset(offset)
  }, [navCollapsed, forumOpen, isAdminRoute, isFullscreenRoute])

  useEffect(() => {
    updateLayout()
    window.addEventListener("resize", updateLayout)
    return () => window.removeEventListener("resize", updateLayout)
  }, [updateLayout])

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

      {!isAdminRoute && !isFullscreenRoute && (
        <TopNav
          navCollapsed={navCollapsed}
          onToggleNav={toggleNav}
          forumOpen={forumOpen}
          forumExpanded={rightExpanded}
          onToggleForum={toggleForum}
        />
      )}

      {/* 左侧导航栏 */}
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
          /* 前台页面：内容区居中，随侧边栏偏移 */
          <div
            className="flex justify-center min-h-[calc(100vh-54px)] px-4 transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${contentOffset}px)` }}
          >
            <div className="w-full max-w-[1100px] py-6">
              <Breadcrumb />
              {children}
            </div>
          </div>
        )}
      </main>

      {!isAdminRoute && !isFullscreenRoute && (
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
      )}
      <MusicPlayer />
    </BreadcrumbProvider>
  )
}
