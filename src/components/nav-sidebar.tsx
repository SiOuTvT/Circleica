"use client"

import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import {
  Compass,
  Home,
  Layers,
  Library,
  Tag,
  Trophy,
  User,
  Users,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { type LogoMode } from "@/lib/branding"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetchSafe } from "@/lib/api-client"
import { getRandomStaff } from "@/lib/vndb-client"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const NAV_SECTIONS = [
  {
    label: "发现",
    items: [
      { icon: Home, label: "首页", href: "/" },
      { icon: Compass, label: "发现", href: "/discover" },
      { icon: Users, label: "制作组图鉴", href: "/credits/studio" },
      { icon: User, label: "创作者图鉴", href: "/credits/creator" },
      { icon: Layers, label: "精选合集", href: "/credits/collection" },
      { icon: Tag, label: "标签浏览", href: "/credits/tag" },
      { icon: Trophy, label: "排行榜", href: "/ranking" },
    ],
  },
]

interface NavSidebarProps {
  collapsed: boolean
  expanded?: boolean
  onToggle: () => void
  mobileOpen?: boolean
  onMobileToggle?: () => void
  logoMode?: LogoMode
  siteLogo?: string | null
}

export function NavSidebar({ collapsed, expanded = false, onToggle: _onToggle, mobileOpen = false, onMobileToggle }: NavSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [randomLoading, setRandomLoading] = useState(false)

  const handleRandomDiscover = useCallback(async () => {
    if (randomLoading) return
    setRandomLoading(true)
    try {
      const { ok, data } = await apiFetchSafe<{ data?: { serialId?: string; id?: string } }>("/api/games/random")
      if (!ok) throw new Error("获取失败")
      router.push(`/games/${data?.data?.serialId ?? data?.data?.id ?? ""}`)
    } catch (err) {
      logger.api.warn("[NavSidebar] random discover failed", { error: err instanceof Error ? err.message : String(err) })
    } finally {
      setRandomLoading(false)
    }
  }, [randomLoading, router])

  const isGalvelica = pathname === "/galvelica" || pathname.startsWith("/galvelica/")

  // 关闭移动端侧边栏当路由变化（用 ref 避免初次渲染误关）
  const prevPathname = useRef(pathname)
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname
      if (mobileOpen && onMobileToggle) {
        onMobileToggle()
      }
    }
  }, [pathname, mobileOpen, onMobileToggle])

  return (
    <>
      {/* 移动端遮罩 */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden cursor-pointer",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0 invisible"
        )}
        onClick={onMobileToggle}
      />

      {/* 侧边栏 */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full overflow-hidden transition-transform duration-300 ease-out lg:transition-[width,transform]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
          width: collapsed ? 60 : expanded ? 216 : mobileOpen ? 180 : 180,
        }}
      >
        <nav className="flex flex-col gap-1 overflow-y-auto overflow-x-hidden h-full px-2 py-3 lg:py-3">
          {/* ── 主站品牌区：站点身份；折叠态仅显示 emblem ── */}
          <Link
            href="/"
            aria-label="Circleica 首页"
            className={cn(
              "flex items-center rounded-xl transition-all overflow-hidden whitespace-nowrap",
              collapsed ? "justify-center mx-auto w-11 h-11" : "gap-3 px-3 py-2.5"
            )}
            title={collapsed ? "Circleica" : undefined}
          >
            {collapsed ? (
              <span className="font-heading text-xl font-bold leading-none text-foreground">C</span>
            ) : (
              <span className="font-heading text-lg font-bold tracking-tight text-foreground leading-none">Circleica</span>
            )}
          </Link>

          {/* ── Galvelica 特色入口：视觉权重高于普通菜单 ── */}
          <Link
            href="/galvelica"
            className={cn(
              "group relative flex items-center rounded-xl py-2.5 font-semibold transition-all whitespace-nowrap overflow-hidden",
              collapsed ? "justify-center px-0 mx-auto w-11 h-11 text-base" : "gap-3 px-3",
              isGalvelica
                ? "bg-[color-mix(in_srgb,var(--gal-accent)_18%,transparent)] text-[var(--gal-accent)] ring-1 ring-[color-mix(in_srgb,var(--gal-accent)_35%,transparent)]"
                : "bg-[color-mix(in_srgb,var(--gal-accent)_9%,transparent)] text-[var(--gal-accent)] hover:bg-[color-mix(in_srgb,var(--gal-accent)_16%,transparent)]"
            )}
            title={collapsed ? "Galvelica · 同人视觉小说资料库" : undefined}
          >
            {/* 左侧强调竖条 */}
            <span
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--gal-accent)]"
              aria-hidden
            />
            <Library className="h-6 w-6 shrink-0" strokeWidth={2.2} />
            {!collapsed && (
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[15px] tracking-wide">Galvelica</span>
                <span className="truncate text-micro font-normal text-muted-foreground/70">同人视觉小说资料库</span>
              </span>
            )}
          </Link>

          {/* 分隔，区分特色入口与普通导航 */}
          <div className="mx-1 my-1 h-px bg-[color-mix(in_srgb,var(--gal-accent)_22%,transparent)]" aria-hidden />

          {/* ── Discover 分区 ── */}
          <div>
            {!collapsed && (
              <p className="discover-section-label mb-1 px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                Discover
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              <DiscoverRandomBtn collapsed={collapsed} />
            </div>
          </div>

          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {section.items.map(({ icon: Icon, label, href }) => {
                const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center rounded-xl py-2.5 font-medium transition-all whitespace-nowrap",
                      collapsed ? "justify-center px-0 mx-auto w-11 h-11 text-sm" : "gap-3 px-3 text-base",
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="h-6 w-6 shrink-0" strokeWidth={2} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}

          {/* 随机发现（跳转随机游戏） */}
          <div>
            <button
              onClick={handleRandomDiscover}
              disabled={randomLoading}
              className={cn(
                "flex items-center rounded-xl py-2.5 font-medium transition-all whitespace-nowrap w-full",
                collapsed ? "justify-center px-0 mx-auto w-11 h-11 text-sm" : "gap-3 px-3 text-base",
                "text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:opacity-50"
              )}
              title={collapsed ? "随机发现" : undefined}
            >
              <Compass className={cn("h-6 w-6 shrink-0", randomLoading && "animate-spin")} strokeWidth={2} />
              {!collapsed && <span>{randomLoading ? "发现中..." : "随机发现"}</span>}
            </button>
          </div>

          {/* ── Discover 分区 ── */}
          <div>
            {!collapsed && (
              <p className="discover-section-label mb-1 px-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                Discover
              </p>
            )}
            <div className="flex flex-col gap-1">
              <DiscoverCreatorBtn collapsed={collapsed} />
              <DiscoverCharacterBtn collapsed={collapsed} />
            </div>
          </div>
        </nav>
      </aside>
    </>
  )
}

/* ── 轻量 Discover 按钮（用于左侧栏） ── */
function useDiscoverNav() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const navToCreator = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      const creator = await getRandomStaff()
      if (creator?.vndbId) {
        router.push(`/creators/vndb/${encodeURIComponent(creator.vndbId)}`)
        return
      }
      const { ok, data } = await apiFetchSafe<{ data?: { slug?: string } }>("/api/creators/random", { cache: "no-store" })
      const inner = data?.data
      if (ok && inner?.slug) {
        router.push(`/credits/creator/${encodeURIComponent(inner.slug)}`)
        return
      }
      const { ok: ok2, data: data2 } = await apiFetchSafe<{ data?: Array<{ id?: string; serialId?: number }> }>("/api/games/random", { cache: "no-store" })
      const game = data2?.data?.[0]
      if (ok2 && game?.serialId) router.push(`/games/${game.serialId}`)
      else toast.error("暂无可推荐的内容")
    } catch (err) {
      logger.game.error("Discover random creator error", err)
      toast.error("随机创作者获取失败")
    } finally {
      setLoading(false)
    }
  }, [loading, router])

  const navToCharacter = useCallback(async () => {
    if (loading) return
    setLoading(true)
    let navigated = false
    try {
      const { getRandomCharacter } = await import("@/lib/vndb-client")
      const character = await getRandomCharacter()
      if (character?.vndbId) {
        router.push(`/characters/${character.vndbId}`)
        navigated = true
      }
    } catch {
      // VNDB failed, try fallback
    } finally {
      if (!navigated) setLoading(false)
    }
    if (navigated) return
    try {
      const { ok, data } = await apiFetchSafe<{ data?: Array<{ id?: string; serialId?: number }> }>("/api/games/random", { cache: "no-store" })
      const game = data?.data?.[0]
      if (ok && game?.serialId) router.push(`/games/${game.serialId}`)
      else toast.error("暂无可推荐的内容")
    } catch {
      toast.error("随机角色获取失败")
    } finally {
      setLoading(false)
    }
  }, [loading, router])

  return { navToCreator, navToCharacter, loading }
}

function DiscoverCreatorBtn({ collapsed }: { collapsed: boolean }) {
  const { navToCreator, loading } = useDiscoverNav()
  return (
    <button
      onClick={navToCreator}
      disabled={loading}
      className={cn(
        "flex items-center rounded-lg py-[6px] font-medium transition-all whitespace-nowrap w-full",
        collapsed ? "justify-center px-0 mx-auto w-10 h-10 text-sm" : "gap-2.5 px-3 text-[13px]",
        "text-muted-foreground hover:bg-accent/50 hover:text-foreground disabled:opacity-50"
      )}
      title={collapsed ? "随机创作者" : undefined}
    >
      {loading
        ? <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
        : <User className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
      {!collapsed && <span>{loading ? "..." : "随机创作者"}</span>}
    </button>
  )
}

function DiscoverCharacterBtn({ collapsed }: { collapsed: boolean }) {
  const { navToCharacter, loading } = useDiscoverNav()
  return (
    <button
      onClick={navToCharacter}
      disabled={loading}
      className={cn(
        "flex items-center rounded-lg py-[6px] font-medium transition-all whitespace-nowrap w-full",
        collapsed ? "justify-center px-0 mx-auto w-10 h-10 text-sm" : "gap-2.5 px-3 text-[13px]",
        "text-muted-foreground hover:bg-accent/50 hover:text-foreground disabled:opacity-50"
      )}
      title={collapsed ? "随机角色" : undefined}
    >
      {loading
        ? <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
        : <Sparkles className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
      {!collapsed && <span>{loading ? "..." : "随机角色"}</span>}
    </button>
  )
}
