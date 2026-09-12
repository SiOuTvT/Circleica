"use client"

import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { SiteFooter } from "@/components/site-footer"
import { TopNav } from "@/components/top-nav"
import { type LogoMode } from "@/lib/branding"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { ChevronUp } from "lucide-react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const NavSidebar = dynamic(() => import("@/components/nav-sidebar").then(m => ({ default: m.NavSidebar })), { ssr: false })
const ForumSidebar = dynamic(() => import("@/components/forum-sidebar").then(m => ({ default: m.ForumSidebar })), { ssr: false })
const MusicPlayer = dynamic(() => import("@/components/music-player").then(m => ({ default: m.MusicPlayer })), { ssr: false })
const EmailVerificationBanner = dynamic(() => import("@/components/email-verification-banner").then(m => ({ default: m.EmailVerificationBanner })), { ssr: false })

/* ═══════════════════════════════════════════════════
   侧边栏宽度常量
   ═══════════════════════════════════════════════════ */
const LEFT_W = 180
const LEFT_EXPANDED_W = 216
const LEFT_COLLAPSED_W = 60
const RIGHT_W = 260
const RIGHT_EXPANDED_W = 340
/** 内容列自身在 lg 断点下的左右留白（对应内层 lg:px-10）；挤位式算 padding 时要扣掉它 */
const CONTENT_GUTTER = 40

export function LayoutWrapper({ children, siteName = "Circleica", logoMode = "full", siteLogo = null }: {
  children: React.ReactNode
  siteName?: string
  logoMode?: LogoMode
  siteLogo?: string | null
}) {
  const pathname = usePathname()
  useOnlineStatus()
  useKeyboardShortcuts()
  const isAdminRoute = pathname.startsWith("/admin")
  const isFullscreenRoute = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/verify-email"
  const isNormalRoute = !isAdminRoute && !isFullscreenRoute
  const isGalvelica = pathname.startsWith("/galvelica")

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

  /* ── 三栏「挤位式」（R36）──
     侧栏仍是 fixed 覆盖层（定位与动画都不重写），改由内容区主动让位：
     外层容器按侧栏实际占宽加 padding，让内容区从「侧栏右缘 + 16」开始，
     内容列再在剩下的可用宽度里 max-w-[1140px] mx-auto（居中 ⇒ 左右间距天然相等）。
     内层内容列自己已带 lg:px-10（40px）留白，故这里扣掉它，避免把间距算两遍。
     窄屏的侧栏是覆盖式抽屉：不设任何 padding（undefined 让响应式 px 类照常生效），行为与之前完全一致。 */
  const contentPadLeft = isDesktop ? leftWidth + 16 - CONTENT_GUTTER : undefined
  const contentPadRight = isDesktop && forumOpen ? rightWidth + 16 - CONTENT_GUTTER : undefined

  /* ── 切换函数 ── */
  const toggleNav = useCallback(() => {
    if (window.innerWidth < 1024) setNavMobileOpen(v => !v)
    else setNavCollapsed(v => !v)
  }, [])

  const toggleForum = useCallback(() => setForumOpen(v => !v), [])

  // 监听侧边栏三条杠按钮的自定义事件
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth < 1024) setNavMobileOpen(v => !v)
      else setNavCollapsed(v => !v)
    }
    window.addEventListener("toggle-nav-sidebar", handler)
    return () => window.removeEventListener("toggle-nav-sidebar", handler)
  }, [])

  // Galvelica 是独立子站：脱离主站框架（侧边栏 / 顶栏 / 面包屑 / 论坛栏 / 播放器），
  // 由 src/app/galvelica/layout.tsx 提供自己的 Header / 导航 / Footer。
  if (isGalvelica) {
    return <BreadcrumbProvider>{children}</BreadcrumbProvider>
  }

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
            className="flex min-h-screen flex-col transition-[padding] duration-300 ease-out"
            style={{ paddingLeft: contentPadLeft, paddingRight: contentPadRight }}
          >
            <div className="flex-1 px-3 sm:px-6 lg:px-10 pb-8">
              <div className="mx-auto max-w-[1140px]">
                <div className="sticky top-0 z-30" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
                  <TopNav onToggleForum={toggleForum} logoMode={logoMode} siteLogo={siteLogo} />
                </div>
                <EmailVerificationBanner />
                <div className="space-y-5 sm:space-y-7 pt-6 sm:pt-8">
                  {children}
                </div>
              </div>
            </div>
            <SiteFooter siteName={siteName} logoMode={logoMode} siteLogo={siteLogo} />
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
      className="fixed right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm ring-1 ring-border text-muted-foreground transition duration-150 ease-in-out hover:text-foreground hover:ring-foreground/20 shadow-2"
      style={{ bottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
      aria-label="回到顶部"
    >
      <ChevronUp className="h-5 w-5" strokeWidth={2} />
    </button>
  )
}
