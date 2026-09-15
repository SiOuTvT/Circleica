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
/** 内容列自身在 lg 断点下的左右留白（对应内层 lg:px-10）；算 padding 时要扣掉它 */
const CONTENT_GUTTER = 40
/** 侧栏与内容列之间的缝 */
const SIDE_GAP = 32

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

  // ≥1440 的恒定预留不经过 JS：那一档的 padding 由 globals.css 的 .layout-shell
  // @media (min-width: 1440px) 直接写死（阈值只存在于那一处）。这里只需要 isDesktop。
  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024)
    const mqlDesktop = window.matchMedia("(min-width: 1024px)")
    const onDesktop = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mqlDesktop.addEventListener("change", onDesktop)
    return () => mqlDesktop.removeEventListener("change", onDesktop)
  }, [])

  // 左栏展开态恒 216（≥1440 的恒定预留就按这个基准对齐）；收起时它自己变窄，不回头影响内容列
  const leftExpanded = isDesktop && !navCollapsed

  // 实际宽度：只有 1024–1439 的挤位式在用（≥1440 一律走下面的常量预留）
  const leftWidth = navCollapsed ? LEFT_COLLAPSED_W : (leftExpanded ? LEFT_EXPANDED_W : LEFT_W)
  const rightWidth = forumOpen ? RIGHT_W : 0

  /* ── 内容列预留（15-G）──
     本层只输出两个 CSS 自定义属性，真正的 padding 由 globals.css 的 .layout-shell 消费：
     ① 1024–1439 挤位式（R36）：--pad-left = 左栏实际占宽 + 32 缝 − 40 内层留白；
        --pad-right 只在论坛栏打开时给（右侧让位，仍然不覆盖），关闭时这个键不写。
     ② ≥1440 恒定预留：由 globals.css 的 @media (min-width: 1440px) 直接写死 208 / 252 覆盖本层，
        JS 完全不参与 —— 首帧即是最终值，不会有「先按挤位画一帧再补预留」那一下。
     ③ <1024：抽屉覆盖 + 遮罩，两个键都不写（响应式 px 类照常生效，行为不变）。
     内层内容列自己已带 lg:px-10（40px），故这里扣掉它，避免把间距算两遍。
     自定义属性不是 CSSProperties 的已知键，用「计算键 + as string」只放宽这两个键，不放宽整个 style。 */
  const padStyle: React.CSSProperties = {
    ...(isDesktop
      ? { ["--pad-left" as string]: `${leftWidth + SIDE_GAP - CONTENT_GUTTER}px` }
      : null),
    ...(isDesktop && forumOpen
      ? { ["--pad-right" as string]: `${rightWidth + SIDE_GAP - CONTENT_GUTTER}px` }
      : null),
  }

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
            className="layout-shell flex min-h-screen flex-col transition-[padding] duration-300 ease-out"
            style={padStyle}
          >
            <div className="flex-1 px-3 sm:px-6 lg:px-10 pb-8">
              <div className="mx-auto w-full max-w-[1560px]">
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
