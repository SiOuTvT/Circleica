"use client"

import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { TopNav } from "@/components/top-nav"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { ChevronUp } from "lucide-react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const NavSidebar = dynamic(() => import("@/components/nav-sidebar").then(m => ({ default: m.NavSidebar })), { ssr: false })
const ForumSidebar = dynamic(() => import("@/components/forum-sidebar").then(m => ({ default: m.ForumSidebar })), { ssr: false })
const MusicPlayer = dynamic(() => import("@/components/music-player").then(m => ({ default: m.MusicPlayer })), { ssr: false })

/* ═══════════════════════════════════════════════════
   侧边栏宽度常量
   ═══════════════════════════════════════════════════ */
const LEFT_W = 200          // 左侧栏正常宽度
const LEFT_EXPANDED_W = 240 // 左侧栏展开（只开左边时）
const LEFT_COLLAPSED_W = 60 // 左侧栏折叠
const RIGHT_W = 260         // 右侧栏正常宽度
const RIGHT_EXPANDED_W = 340 // 右侧栏展开（只开右边时）

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useOnlineStatus()
  useKeyboardShortcuts()
  const isAdminRoute = pathname.startsWith("/admin")
  const isFullscreenRoute = pathname === "/login" || pathname === "/register"
  const isNormalRoute = !isAdminRoute && !isFullscreenRoute

  /* ── 侧边栏状态 ── */
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [navMobileOpen, setNavMobileOpen] = useState(false)
  const [forumOpen, setForumOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024)
    const mql = window.matchMedia("(min-width: 1024px)")
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  // 只开一边时那一边变大
  const leftExpanded = isDesktop && !navCollapsed && !forumOpen
  const rightExpanded = isDesktop && navCollapsed && forumOpen

  // 实际宽度
  const leftWidth = navCollapsed ? LEFT_COLLAPSED_W : (leftExpanded ? LEFT_EXPANDED_W : LEFT_W)
  const rightWidth = forumOpen ? (rightExpanded ? RIGHT_EXPANDED_W : RIGHT_W) : 0

  /* ── 内容区偏移 ── */
  const [contentOffset, setContentOffset] = useState(0)

  const calcOffset = useCallback(() => {
    if (!isDesktop) return 0
    const sw = window.innerWidth
    const pageCenter = sw / 2
    const onlyLeft = !navCollapsed && !forumOpen
    const onlyRight = navCollapsed && forumOpen

    if (onlyRight) {
      // 只开右边：保持和右边的距离跟两边都开时一样
      const bothOpenAvailable = sw - LEFT_W - RIGHT_W
      const bothOpenCenter = LEFT_W + bothOpenAvailable / 2
      const distFromRight = sw - bothOpenCenter - RIGHT_W
      const targetCenter = sw - rightWidth - distFromRight
      return targetCenter - pageCenter
    }

    // 其他状态：在可用空间居中
    const available = sw - leftWidth - rightWidth
    const center = leftWidth + available / 2
    let offset = center - pageCenter
    if (onlyLeft) offset -= leftWidth / 5 // 只开左边往左靠
    return offset
  }, [isDesktop, navCollapsed, forumOpen, leftWidth, rightWidth])

  useEffect(() => {
    setContentOffset(calcOffset())
  }, [calcOffset])

  useEffect(() => {
    if (!isDesktop) return
    const onResize = () => setContentOffset(calcOffset())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [isDesktop, calcOffset])

  /* ── 切换函数 ── */
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
            className="flex min-h-screen flex-col transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${contentOffset}px)` }}
          >
            <div className="flex-1 px-3 sm:px-4 pb-8">
              <div className="mx-auto max-w-[1140px]">
                <div className="sticky top-0 z-30">
                  <TopNav onToggleNav={toggleNav} onToggleForum={toggleForum} />
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <Breadcrumb />
                  {children}
                </div>
              </div>
            </div>
            <footer role="contentinfo" className="border-t border-border bg-muted/30 py-6 text-center text-xs text-muted-foreground">
              <div className="mx-auto max-w-[1140px] px-4">
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
      <BackToTop />
    </BreadcrumbProvider>
  )
}

function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm ring-1 ring-border text-muted-foreground transition-all hover:text-foreground hover:ring-foreground/20 shadow-md"
      aria-label="回到顶部"
    >
      <ChevronUp className="h-5 w-5" strokeWidth={2} />
    </button>
  )
}
