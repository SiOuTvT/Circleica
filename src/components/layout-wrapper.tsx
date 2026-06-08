"use client"

import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { ForumSidebar } from "@/components/forum-sidebar"
import { MusicPlayer } from "@/components/music-player"
import { NavSidebar } from "@/components/nav-sidebar"
import { TopNav } from "@/components/top-nav"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

/* ═══════════════════════════════════════════════════
   侧边栏宽度常量
   ═══════════════════════════════════════════════════ */
const LEFT_W = 220          // 左侧栏正常宽度
const LEFT_EXPANDED_W = 260 // 左侧栏展开（只开左边时）
const LEFT_COLLAPSED_W = 60 // 左侧栏折叠
const RIGHT_W = 280         // 右侧栏正常宽度
const RIGHT_EXPANDED_W = 360 // 右侧栏展开（只开右边时）

/* 两边都开时，内容区在左右之间的基准中心点 */
function getBaseCenter(sw: number) {
  return LEFT_W + (sw - LEFT_W - RIGHT_W) / 2
}

/* ═══════════════════════════════════════════════════
   内容区偏移计算

   四种状态：
   1. 两边都开 → 内容在左右之间居中
   2. 只开左边 → 内容居中后往左靠一点（nudge）
   3. 只开右边 → 内容和右边的距离保持和两边都开时一样
   4. 都关     → 内容在页面居中
   ═══════════════════════════════════════════════════ */
function calcContentOffset(
  sw: number,
  leftW: number,
  rightW: number,
  onlyLeft: boolean,
  onlyRight: boolean,
): number {
  const pageCenter = sw / 2

  // 只开右边：保持和右边的距离不变
  if (onlyRight) {
    const baseCenter = getBaseCenter(sw)
    const baseDistFromRight = sw - baseCenter - RIGHT_W
    const targetCenter = sw - rightW - baseDistFromRight
    return targetCenter - pageCenter
  }

  // 其他状态：在可用空间内居中
  const available = sw - leftW - rightW
  const center = leftW + available / 2
  let offset = center - pageCenter

  // 只开左边：往左靠一点
  if (onlyLeft) offset -= leftW / 5

  return offset
}

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
  }, [])

  // 只开一边时那一边变大
  const leftExpanded = isDesktop && !navCollapsed && !forumOpen
  const rightExpanded = isDesktop && navCollapsed && forumOpen

  // 实际宽度
  const leftWidth = navCollapsed ? LEFT_COLLAPSED_W : (leftExpanded ? LEFT_EXPANDED_W : LEFT_W)
  const rightWidth = forumOpen ? (rightExpanded ? RIGHT_EXPANDED_W : RIGHT_W) : 0

  // 状态标记
  const onlyLeft = isDesktop && !navCollapsed && !forumOpen
  const onlyRight = isDesktop && navCollapsed && forumOpen

  /* ── 内容区偏移 ── */
  const [contentOffset, setContentOffset] = useState(0)

  useEffect(() => {
    if (!isDesktop) { setContentOffset(0); return }
    setContentOffset(calcContentOffset(window.innerWidth, leftWidth, rightWidth, onlyLeft, onlyRight))
  }, [isDesktop, leftWidth, rightWidth, onlyLeft, onlyRight])

  // 窗口大小变化时重新计算
  useEffect(() => {
    if (!isDesktop) return
    const onResize = () => {
      setContentOffset(calcContentOffset(window.innerWidth, leftWidth, rightWidth, onlyLeft, onlyRight))
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [isDesktop, leftWidth, rightWidth, onlyLeft, onlyRight])

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
            className="min-h-screen transition-transform duration-300 ease-out"
            style={{ transform: `translateX(${contentOffset}px)` }}
          >
            <div className="px-4 pb-8">
              <div className="mx-auto max-w-[1100px]">
                <div className="sticky top-0 z-30 pt-3 pb-4">
                  <TopNav onToggleNav={toggleNav} onToggleForum={toggleForum} />
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
