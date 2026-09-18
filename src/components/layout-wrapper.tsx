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
   侧栏 / 内容列几何常量（R-01 v2：内容列宽度恒定、只平移）
   ═══════════════════════════════════════════════════ */
/** 左栏展开态宽；收起成 60 窄轨时仍按 216 计（收起不移动内容、也不改变内容宽） */
const LEFT_EXPANDED_W = 216
/** 论坛栏宽（fixed 右贴边，定位不动） */
const RIGHT_W = 260
/** 内容列自身在 lg 断点下的左右留白（对应内层 lg:px-10）；算 padding 时扣掉一次即可，勿重复扣减 */
const CONTENT_GUTTER = 40
/**
 * 侧栏与内容区之间的缝（= 侧栏内边缘到内容区文字的视觉距离），随开栏数变化：
 *   · 只开左侧导航栏（论坛栏关）→ 56（可继续调的旋钮；再大一档建议 64）
 *   · 左导航 + 论坛栏同开 → 24
 */
const SIDE_GAP_SOLO = 56
const SIDE_GAP_BOTH = 24
/**
 * 固定总预留：两栏全开时两侧占掉的空间（216 + 260 + 2×24 = 524）。
 * 内容列宽度 = 视口宽 − RESERVE，与开合状态、与桌面宽度都无关；
 * 开合产生的差值全部交给对侧留白吸收
 * （论坛关闭时右侧留白 = 524 − 216 − 缝 = 252，论坛打开时 = 260 + 24 = 284 —— 都是刻意保留的）。
 */
const RESERVE = LEFT_EXPANDED_W + RIGHT_W + 2 * SIDE_GAP_BOTH

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

  // 左栏展开 / 收起只影响它自己的宽度（nav-sidebar.tsx 内部实现），不再参与内容列的定位
  const leftExpanded = isDesktop && !navCollapsed

  // 缝随开栏数变化：只开左导航 56，左右同开 24
  const sideGap = forumOpen ? SIDE_GAP_BOTH : SIDE_GAP_SOLO

  /* ── 内容列定位（R-01 v2：宽度恒定、只平移）──
     视口 = 左栏 + 左缝 + 内容 + 右缝 + 右栏，内容宽恒 = 视口 − RESERVE(524)。
     本层只写 padding（位移），绝不写 width —— 卡片 / 网格不重排，这是"高级流畅"的关键：
       padding-left  = 左栏 216 + 缝 − 40           ⇒ 论坛关 232 / 论坛开 200（内容左右平移 32）
       padding-right = RESERVE − 左栏 216 − 缝 − 40  ⇒ 论坛关 212 / 论坛开 244
     两式之和恒为 444（+ 内层留白 80 = 524）⇒ 内容列宽度恒定，开合只产生平移、不改变宽度。
     <1024：抽屉覆盖 + 遮罩，两个键都不写（响应式 px 类照常生效，行为不变）。
     首帧（脚本接管前）由 CSS 的 --shell-pad-{left,right}-default 给出默认态 232 / 212，
     挂载后 JS 写入同值 ⇒ 无跳变、也不会播出一次入场动画。
     过渡时长与缓动统一写在 globals.css 的 .layout-shell 规则里，本文件不重复。
     自定义属性不是 CSSProperties 的已知键，用「计算键 + as string」只放宽这两个键，不放宽整个 style。 */
  const padStyle: React.CSSProperties = {
    ...(isDesktop
      ? {
          ["--pad-left" as string]: `${LEFT_EXPANDED_W + sideGap - CONTENT_GUTTER}px`,
          ["--pad-right" as string]: `${RESERVE - LEFT_EXPANDED_W - sideGap - CONTENT_GUTTER}px`,
        }
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
            className="layout-shell flex min-h-screen flex-col transition-[padding]"
            style={padStyle}
          >
            <div className="flex-1 px-3 sm:px-6 lg:px-10 pb-8">
              {/* 宽度由外层预留（视口 − 524）决定、恒定不变；去掉 mx-auto 改左对齐锚定，
                  右侧多出来的留白是给论坛栏预留的位置，刻意保留（R-01 v2） */}
              <div className="w-full max-w-[1560px]">
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
