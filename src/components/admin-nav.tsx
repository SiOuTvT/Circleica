"use client"

import type { UserRole } from "@/lib/admin"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
  ArrowLeft, Award, CalendarCheck, ChevronLeft, ChevronRight, ClipboardCheck, Flag, FolderTree, Frame, Gamepad2, Heart,
  LayoutDashboard, Megaphone, Menu, MessageSquare, Moon, Music, Palette,
  PenTool, Search, Settings, SmilePlus, Sun, Tag, Type, UserPlus, Users, X,
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

interface NavItem {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  href: string
  minRole: UserRole
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    items: [
      { icon: LayoutDashboard, label: "仪表盘", href: "/admin", minRole: "ADMIN" },
      { icon: ClipboardCheck, label: "审核队列", href: "/admin/review", minRole: "ADMIN" },
    ],
  },
  {
    label: "内容管理",
    items: [
      { icon: Gamepad2, label: "游戏", href: "/admin/games", minRole: "ADMIN" },
      { icon: Tag, label: "标签管理", href: "/admin/tags", minRole: "ADMIN" },
      { icon: PenTool, label: "创作者", href: "/admin/creators", minRole: "ADMIN" },
      { icon: Megaphone, label: "公告", href: "/admin/announcements", minRole: "ADMIN" },
      { icon: Music, label: "音乐", href: "/admin/music", minRole: "ADMIN" },
    ],
  },
  {
    label: "社区",
    items: [
      { icon: MessageSquare, label: "论坛", href: "/admin/forum", minRole: "ADMIN" },
      { icon: Flag, label: "举报", href: "/admin/reports", minRole: "ADMIN" },
      { icon: CalendarCheck, label: "签到记录", href: "/admin/checkins", minRole: "ADMIN" },
      { icon: Heart, label: "收藏数据", href: "/admin/favorites", minRole: "ADMIN" },
      { icon: UserPlus, label: "关注关系", href: "/admin/follows", minRole: "ADMIN" },
    ],
  },
  {
    label: "系统",
    items: [
      { icon: SmilePlus, label: "情感消息", href: "/admin/emotional-messages", minRole: "SUPER_ADMIN" },
      { icon: FolderTree, label: "资源标签", href: "/admin/resource-tags", minRole: "SUPER_ADMIN" },
      { icon: Users, label: "用户", href: "/admin/users", minRole: "SUPER_ADMIN" },
      { icon: Frame, label: "头像框", href: "/admin/avatar-frames", minRole: "SUPER_ADMIN" },
      { icon: Settings, label: "站点设置", href: "/admin/site-settings", minRole: "SUPER_ADMIN" },
      { icon: Award, label: "成就", href: "/admin/achievements", minRole: "SUPER_ADMIN" },
      { icon: Type, label: "文案", href: "/admin/copy", minRole: "SUPER_ADMIN" },
      { icon: Palette, label: "主题设置", href: "/admin/theme", minRole: "SUPER_ADMIN" },
    ],
  },
]

const STORAGE_KEY = "admin-sidebar-collapsed"
const THEME_KEY = "admin-theme-mode" // "light" | "dark" | "system"

type ThemeMode = "light" | "dark" | "system"

function getResolvedTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light"
    }
    return "dark"
  }
  return mode
}

function applyTheme(mode: ThemeMode) {
  const resolved = getResolvedTheme(mode)
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
}

const ROLE_LEVEL: Record<string, number> = { USER: 0, ADMIN: 1, SUPER_ADMIN: 2 }

export function AdminNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = (session?.user as Record<string, unknown>)?.role as string ?? "USER"
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark")
  const [mounted, setMounted] = useState(false)
  const [badgeCounts, setBadgeCounts] = useState<{ reports: number; unpublishedGames: number }>({ reports: 0, unpublishedGames: 0 })

  // 获取待办数量
  useEffect(() => {
    fetch("/api/admin/counts")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setBadgeCounts({ reports: data.reports ?? 0, unpublishedGames: data.unpublishedGames ?? 0 })
      })
      .catch(() => {})
  }, [])

  // 根据 href 返回待办数量
  const getBadgeCount = (href: string): number => {
    if (href === "/admin/reports") return badgeCounts.reports
    if (href === "/admin/games") return badgeCounts.unpublishedGames
    return 0
  }

  const visibleGroups = useMemo(
    () => navGroups.map(g => ({
      ...g,
      items: g.items.filter(item => (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[item.minRole] ?? 0)),
    })).filter(g => g.items.length > 0),
    [userRole]
  )

  // 初始化：读取 localStorage
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "true") {
      setCollapsed(true)
      document.documentElement.setAttribute("data-admin-collapsed", "true")
    }

    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null
    const mode = savedTheme || "system"
    setThemeMode(mode)
    applyTheme(mode)

    // 监听系统主题变化（仅 system 模式）
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const handler = () => {
      const current = localStorage.getItem(THEME_KEY) as ThemeMode | null
      if (current === "system" || !current) {
        applyTheme("system")
      }
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // 切换侧边栏
  const toggleSidebar = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      // 设置 data 属性供 CSS 布局响应
      document.documentElement.setAttribute("data-admin-collapsed", String(next))
      return next
    })
  }, [])

  // 切换主题
  const cycleTheme = useCallback(() => {
    setThemeMode(prev => {
      const next: ThemeMode = prev === "dark" ? "light" : prev === "light" ? "system" : "dark"
      localStorage.setItem(THEME_KEY, next)
      applyTheme(next)
      return next
    })
  }, [])

  // 关闭手机侧边栏当路由变化
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const sidebarWidth = collapsed ? "w-[68px]" : "w-[220px]"

  return (
    <>
      {/* ═══════════ 桌面端左侧边栏 ═══════════ */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-border bg-card/95 backdrop-blur-lg transition-all duration-300 ease-in-out md:flex",
          sidebarWidth,
        )}
      >
        {/* 顶部：用户信息 + 收缩按钮 */}
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0 px-2 py-1.5">
              {session?.user?.image ? (
                <Image src={session.user.image} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" unoptimized />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/80 text-sm font-bold text-primary-foreground">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "A"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{session?.user?.name || "管理员"}</p>
                <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
                  {userRole === "SUPER_ADMIN" ? "超级管理员" : "管理员"}
                </span>
              </div>
            </div>
          ) : (
            session?.user?.image ? (
              <Image src={session.user.image} alt="" width={28} height={28} className="mx-auto h-7 w-7 shrink-0 rounded-full object-cover" unoptimized />
            ) : (
              <div className="mx-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/80 text-xs font-bold text-primary-foreground">
                {session?.user?.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
            )
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-accent hover:text-foreground",
              collapsed && "mx-auto"
            )}
            title={collapsed ? "展开侧边栏" : "收缩侧边栏"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" strokeWidth={2} /> : <ChevronLeft className="h-4 w-4" strokeWidth={2} />}
          </button>
        </div>

        {/* 返回前台 + 搜索 */}
        <div className="px-3 pt-2 flex flex-col gap-1">
          <Link
            href="/"
            title={collapsed ? "返回前台" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-all hover:bg-accent/60 hover:text-foreground",
              collapsed ? "justify-center h-9 w-9 mx-auto" : "w-full px-3 py-2"
            )}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
            {!collapsed && <span className="truncate">返回前台</span>}
          </Link>
          <button
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
            }}
            title={collapsed ? "全局搜索 (Ctrl+K)" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-all hover:bg-accent/60 hover:text-foreground",
              collapsed ? "justify-center h-9 w-9 mx-auto" : "w-full px-3 py-2"
            )}
          >
            <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
            {!collapsed && (
              <>
                <span className="truncate flex-1 text-left">搜索</span>
                <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground ring-1 ring-border">⌘K</kbd>
              </>
            )}
          </button>
        </div>

        {/* 导航列表 */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
          <div className="flex flex-col gap-0.5">
            {visibleGroups.map((group, gi) => (
              <div key={group.label ?? gi}>
                {group.label && !collapsed && (
                  <div className="px-3 pt-4 pb-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">{group.label}</span>
                  </div>
                )}
                {group.label && collapsed && (
                  <div className="px-3 pt-3 pb-1"><div className="h-px bg-border" /></div>
                )}
                {group.items.map(({ icon: Icon, label, href }) => {
                  const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href))
                  const badge = getBadgeCount(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                        isActive
                          ? "bg-accent text-foreground shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      <span className="relative">
                        <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={2} />
                        {badge > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </span>
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        </nav>

        {/* 底部：主题切换 + 收缩提示 */}
        <div className="border-t border-border px-2 py-3">
          <button
            onClick={cycleTheme}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground transition-all hover:bg-accent/60 hover:text-foreground",
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
            )}
            title={
              themeMode === "dark" ? "当前：深色模式（点击切换）" :
              themeMode === "light" ? "当前：浅色模式（点击切换）" :
              "当前：跟随系统（点击切换）"
            }
          >
            {mounted && (
              <>
                {themeMode === "dark" && <Moon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
                {themeMode === "light" && <Sun className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
                {themeMode === "system" && (
                  <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                    <Sun className="absolute h-[18px] w-[18px] opacity-50" strokeWidth={2} />
                    <Moon className="absolute h-[10px] w-[10px] translate-x-[2px] -translate-y-[2px]" strokeWidth={2} />
                  </span>
                )}
              </>
            )}
            {!collapsed && (
              <span className="truncate">
                {themeMode === "dark" ? "深色模式" : themeMode === "light" ? "浅色模式" : "跟随系统"}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ═══════════ 手机端顶部栏 ═══════════ */}
      <nav className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-lg md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <span className="text-sm font-semibold text-foreground">管理后台</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
          </button>
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
          >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </Link>
        </div>
      </nav>

      {/* ═══════════ 手机端遮罩 ═══════════ */}
      <div
        className={cn(
          "fixed inset-0 z-40 touch-none bg-black/50 backdrop-blur-sm transition-opacity duration-200 md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* ═══════════ 手机端侧边栏 ═══════════ */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col bg-card shadow-2xl transition-transform duration-200 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 顶部 */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold text-foreground">管理后台</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* 返回前台 */}
        <div className="px-3 pt-2">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/60 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            <span>返回前台</span>
          </Link>
        </div>

        {/* 导航 */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <div className="flex flex-col gap-0.5">
            {visibleGroups.map((group, gi) => (
              <div key={group.label ?? gi}>
                {group.label && (
                  <div className="px-3 pt-4 pb-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">{group.label}</span>
                  </div>
                )}
                {group.items.map(({ icon: Icon, label, href }) => {
                  const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href))
                  const badge = getBadgeCount(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-accent text-foreground shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      <span className="relative">
                        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        {badge > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </span>
                      <span>{label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        </nav>

        {/* 底部主题切换 */}
        <div className="border-t border-border px-3 py-3">
          <button
            onClick={cycleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/60 hover:text-foreground"
          >
            {mounted && (
              <>
                {themeMode === "dark" && <Moon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
                {themeMode === "light" && <Sun className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />}
                {themeMode === "system" && (
                  <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                    <Sun className="absolute h-[18px] w-[18px] opacity-50" strokeWidth={2} />
                    <Moon className="absolute h-[10px] w-[10px] translate-x-[2px] -translate-y-[2px]" strokeWidth={2} />
                  </span>
                )}
              </>
            )}
            <span>
              {themeMode === "dark" ? "深色模式" : themeMode === "light" ? "浅色模式" : "跟随系统"}
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}