"use client"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Compass,
  Home,
  Layers,
  Library,
  Loader2,
  Menu,
  Sparkles,
  Tag,
  Trophy,
  User,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetchSafe } from "@/lib/api-client"
import { getRandomStaff } from "@/lib/vndb-client"
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
}

export function NavSidebar({ collapsed, expanded = false, onToggle: _onToggle, mobileOpen = false, onMobileToggle }: NavSidebarProps) {
  const pathname = usePathname()
  const [randomLoading, setRandomLoading] = useState(false)
  const router = useRouter()

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

  const handleCreator = useCallback(async () => {
    if (randomLoading) return
    setRandomLoading(true)
    try {
      // 快速尝试 VNDB（10秒总超时）
      const creator = await Promise.race([
        getRandomStaff(),
        new Promise<null>((r) => setTimeout(() => r(null), 10000)),
      ])
      if (creator?.vndbId) {
        router.push(`/creators/vndb/${encodeURIComponent(creator.vndbId)}`)
        return
      }
      // 降级：随机游戏（本地DB，快速）
      const { ok, data } = await apiFetchSafe<{ data?: Array<{ serialId?: number }> }>("/api/games/random", { cache: "no-store" })
      if (ok && data?.data?.[0]?.serialId) router.push(`/games/${data.data[0].serialId}`)
      else toast.error("暂无可推荐的内容")
    } catch {
      // VNDB 失败：降级随机游戏
      const { ok, data } = await apiFetchSafe<{ data?: Array<{ serialId?: number }> }>("/api/games/random", { cache: "no-store" })
      if (ok && data?.data?.[0]?.serialId) router.push(`/games/${data.data[0].serialId}`)
      else toast.error("暂无可推荐的内容")
    } finally { setRandomLoading(false) }
  }, [randomLoading, router])

  const handleCharacter = useCallback(async () => {
    if (randomLoading) return
    setRandomLoading(true)
    try {
      const { getRandomCharacter } = await import("@/lib/vndb-client")
      const character = await Promise.race([
        getRandomCharacter(),
        new Promise<null>((r) => setTimeout(() => r(null), 10000)),
      ])
      if (character?.vndbId) {
        router.push(`/characters/${character.vndbId}`)
        return
      }
      // 降级：随机游戏
      const { ok, data } = await apiFetchSafe<{ data?: Array<{ serialId?: number }> }>("/api/games/random", { cache: "no-store" })
      if (ok && data?.data?.[0]?.serialId) router.push(`/games/${data.data[0].serialId}`)
      else toast.error("暂无可推荐的内容")
    } catch {
      const { ok, data } = await apiFetchSafe<{ data?: Array<{ serialId?: number }> }>("/api/games/random", { cache: "no-store" })
      if (ok && data?.data?.[0]?.serialId) router.push(`/games/${data.data[0].serialId}`)
      else toast.error("暂无可推荐的内容")
    } finally { setRandomLoading(false) }
  }, [randomLoading, router])

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
          "fixed left-0 top-[env(safe-area-inset-top,0px)] z-50 h-[calc(100dvh-env(safe-area-inset-top,0px))] overflow-hidden transition-transform duration-300 ease-out lg:top-0 lg:h-full lg:transition-[width,color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter]",
          // 桌面宽度：收起 60 / 展开 216 / 默认 180；移动端统一 min(82vw,300px)（对齐移动端设计系统 8px 栅格与触控基线）
          collapsed ? "w-[60px]" : expanded ? "w-[216px]" : "w-[180px] max-lg:w-[min(82vw,300px)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        <nav className="flex flex-col gap-1 overflow-y-auto overflow-x-hidden h-full px-2 py-3 lg:py-3">
          {/* ── 侧边栏顶部：三条杠按钮，控制侧边栏展开/收起 ── */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    if (onMobileToggle) onMobileToggle()
                  } else {
                    const event = new CustomEvent("toggle-nav-sidebar")
                    window.dispatchEvent(event)
                  }
                }}
                data-ripple
                className={cn(
                  "flex items-center rounded-xl transition-all whitespace-nowrap nav-icon-btn",
                  collapsed ? "justify-center mx-auto w-11 h-11" : "gap-3 px-3 py-2.5"
                )}
                aria-label="切换侧边栏"
              >
                <Menu className="h-[22px] w-[22px] shrink-0" strokeWidth={2} />
                {!collapsed && (
                  <span className="text-[15px] font-medium text-muted-foreground">菜单</span>
                )}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">菜单</TooltipContent>}
          </Tooltip>

          {/* ── Galvelica 特色入口：视觉权重高于普通菜单 ── */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/galvelica"
                  data-ripple
                  className="group relative flex items-center justify-center rounded-xl py-2.5 font-semibold transition duration-150 ease-in-out whitespace-nowrap overflow-hidden w-11 h-11 text-[15px] bg-[color-mix(in_srgb,var(--gal-accent)_9%,transparent)] text-[var(--gal-accent)] hover:bg-[color-mix(in_srgb,var(--gal-accent)_16%,transparent)]"
                >
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--gal-accent)]" aria-hidden />
                  <Library className="h-[22px] w-[22px] shrink-0" strokeWidth={2.2} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Galvelica：同人视觉小说资料库</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/galvelica"
              data-ripple
              className={cn(
                "group relative flex items-center rounded-xl py-2.5 font-semibold transition duration-150 ease-in-out whitespace-nowrap overflow-hidden gap-3 px-3",
                isGalvelica
                  ? "bg-[color-mix(in_srgb,var(--gal-accent)_18%,transparent)] text-[var(--gal-accent)] ring-1 ring-[color-mix(in_srgb,var(--gal-accent)_35%,transparent)]"
                  : "bg-[color-mix(in_srgb,var(--gal-accent)_9%,transparent)] text-[var(--gal-accent)] hover:bg-[color-mix(in_srgb,var(--gal-accent)_16%,transparent)]"
              )}
            >
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--gal-accent)]" aria-hidden />
              <Library className="h-[22px] w-[22px] shrink-0" strokeWidth={2.2} />
              <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
                <span className="truncate text-[15px] tracking-wide">Galvelica</span>
                <span className="truncate text-[12px] font-normal text-muted-foreground/70">同人视觉小说资料库</span>
              </span>
            </Link>
          )}

          {/* 分隔，区分特色入口与普通导航 */}
          <div className="mx-1 my-1 h-px bg-[color-mix(in_srgb,var(--gal-accent)_22%,transparent)]" aria-hidden />

          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {section.items.map(({ icon: Icon, label, href }) => {
                const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
                const link = (
                  <Link
                    key={href}
                    href={href}
                    data-ripple
                    className={cn(
                      "flex items-center rounded-xl py-2.5 font-medium transition duration-150 ease-in-out whitespace-nowrap",
                      collapsed ? "justify-center px-0 mx-auto w-11 h-11 text-[15px]" : "gap-3 px-3 text-[15px]",
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                )
                return collapsed ? (
                  <Tooltip key={href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                ) : link
              })}
            </div>
          ))}
          {/* ── 随机发现（排行榜下方）── */}
          <div className="flex flex-col gap-0.5">
            {(() => {
              const creatorBtn = (
                <button onClick={handleCreator} disabled={randomLoading} data-ripple className={cn("flex items-center rounded-xl py-2.5 font-medium transition duration-150 ease-in-out whitespace-nowrap w-full", collapsed ? "justify-center px-0 mx-auto w-11 h-11 text-[15px]" : "gap-3 px-3 text-[15px]", "text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:opacity-50")}>
                  {randomLoading ? <Loader2 className="h-[22px] w-[22px] animate-spin" strokeWidth={2} /> : <User className="h-[22px] w-[22px] shrink-0" strokeWidth={2} />}
                  {!collapsed && <span>{randomLoading ? "..." : "随机创作者"}</span>}
                </button>
              )
              const characterBtn = (
                <button onClick={handleCharacter} disabled={randomLoading} data-ripple className={cn("flex items-center rounded-xl py-2.5 font-medium transition duration-150 ease-in-out whitespace-nowrap w-full", collapsed ? "justify-center px-0 mx-auto w-11 h-11 text-[15px]" : "gap-3 px-3 text-[15px]", "text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:opacity-50")}>
                  {randomLoading ? <Loader2 className="h-[22px] w-[22px] animate-spin" strokeWidth={2} /> : <Sparkles className="h-[22px] w-[22px] shrink-0" strokeWidth={2} />}
                  {!collapsed && <span>{randomLoading ? "..." : "随机角色"}</span>}
                </button>
              )
              return (
                <>
                  {collapsed ? <Tooltip><TooltipTrigger asChild>{creatorBtn}</TooltipTrigger><TooltipContent side="right">随机创作者</TooltipContent></Tooltip> : creatorBtn}
                  {collapsed ? <Tooltip><TooltipTrigger asChild>{characterBtn}</TooltipTrigger><TooltipContent side="right">随机角色</TooltipContent></Tooltip> : characterBtn}
                </>
              )
            })()}
          </div>
        </nav>
      </aside>
    </>
  )
}


