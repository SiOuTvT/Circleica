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

// 侧边栏宽度常量
const LEFT_W = 220
const LEFT_EXPANDED_W = 260
const LEFT_COLLAPSED_W = 60
const RIGHT_W = 280
const RIGHT_EXPANDED_W = 360

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useOnlineStatus()
  useKeyboardShortcuts()
  const isAdminRoute = pathname.startsWith("/admin")
  const isFullscreenRoute = pathname === "/login" || pathname === "/register"
  const isNormalRoute = !isAdminRoute && !isFullscreenRoute

  // ── 侧边栏状态 ──
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [navMobileOpen, setNavMobileOpen] = useState(false)
  const [forumOpen, setForumOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const desktop = window.innerWidth >= 1024
    setIsDesktop(desktop)
    setForumOpen(desktop)
  }, [])

  // 只开一边时那一边变大
  const leftExpanded = isDesktop && !navCollapsed && !forumOpen
  const rightExpanded = isDesktop && navCollapsed && forumOpen

  // 左侧栏实际宽度
  const leftWidth = navCollapsed ? LEFT_COLLAPSED_W : (leftExpanded ? LEFT_EXPANDED_W : LEFT_W)
  // 右侧栏实际宽度
  const rightWidth = forumOpen ? (rightExpanded ? RIGHT_EXPANDED_W : RIGHT_W) : 0

  // ── 内容区偏移：居中 + 往侧边栏靠 ──
  const [contentOffset, setContentOffset] = useState(0)

  useEffect(() => {
    if (!isDesktop) { setContentOffset(0); return }
    const sw = window.innerWidth
    const available = sw - leftWidth - rightWidth
    const centerOfAvailable = leftWidth + available / 2
    const centerOfPage = sw / 2
    let offset = centerOfAvailable - centerOfPage
    if (navCollapsed && forumOpen) offset += rightWidth / 5
    else if (!navCollapsed && !forumOpen) offset -= leftWidth / 5
    setContentOffset(offset)
  }, [isDesktop, navCollapsed, forumOpen, leftExpanded, rightExpanded, leftWidth, rightWidth])

  // ── 切换函数 ──
  const toggleNav = useCallback(() => {
    if (window.innerWidth < 1024) setNavMobileOpen(v => !v)
    else setNavCollapsed(v => !v)
  }, [])

  const toggleForum = useCallback(() => setForumOpen(v => !v), [])

  return (
    <BreadcrumbProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        跳到主要内容
      </a>

      {/* 左侧导航栏 */}
      {isNormalRoute && (
        <NavSidebar
          collapsed={navCollapsed}
          expanded={leftExpanded}
          onToggle={toggleNav}
          mobileOpen={navMobileOpen}
          onMobileToggle={() => setNavMobileOpen(v => !v)}
        />
      )}

      <main id="main-content" role="main" className="min-h-screen overflow-x-clip">
        {isAdminRoute || isFullscreenRoute ? (
          children
        ) : (
          <div
            className="min-h-screen transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${contentOffset}px)` }}
          >
            <div className="px-4 pb-8">
              <div className="mx-auto max-w-[1100px]">
                <div className="sticky top-0 z-30 pt-3 pb-4">
                  <TopNav
                    navCollapsed={navCollapsed}
                    onToggleNav={toggleNav}
                    forumOpen={forumOpen}
                    forumExpanded={rightExpanded}
                    onToggleForum={toggleForum}
                  />
                </div>
                <div className="py-4">
                  <Breadcrumb />
                  {children}
                </div>
              </div>
            </div>
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

      {/* 论坛侧边栏 - 在 translateX 容器外面，避免 fixed 定位被 transform 影响 */}
      {isNormalRoute && (
        <ForumSidebar
          open={forumOpen}
          expanded={rightExpanded}
          onToggle={toggleForum}
        />
      )}

      <MusicPlayer />
    </BreadcrumbProvider>
  )
}
