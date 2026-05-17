"use client"

import { cn } from "@/lib/utils"
import {
  ArrowLeft, CalendarCheck, ChevronLeft, ChevronRight, Flag, Gamepad2, Heart,
  LayoutDashboard, Megaphone, Menu, MessageSquare, Moon, Music, Palette,
  PenTool, Sun, Tag, UserPlus, Users, X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const items = [
  { icon: LayoutDashboard, label: "仪表盘",     href: "/admin" },
  { icon: Gamepad2,        label: "游戏管理",    href: "/admin/games" },
  { icon: Tag,             label: "标签管理",    href: "/admin/tags" },
  { icon: PenTool,         label: "创作者管理",  href: "/admin/creators" },
  { icon: Megaphone,       label: "公告管理",    href: "/admin/announcements" },
  { icon: Music,           label: "音乐管理",    href: "/admin/music" },
  { icon: MessageSquare,   label: "论坛管理",    href: "/admin/forum" },
  { icon: Flag,            label: "举报管理",    href: "/admin/reports" },
  { icon: CalendarCheck,   label: "签到记录",    href: "/admin/checkins" },
  { icon: Heart,           label: "收藏数据",    href: "/admin/favorites" },
  { icon: UserPlus,        label: "关注关系",    href: "/admin/follows" },
  { icon: Users,           label: "用户管理",    href: "/admin/users" },
  { icon: Palette,         label: "主题设置",    href: "/admin/theme" },
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

export function AdminNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark")
  const [mounted, setMounted] = useState(false)

  // 初始化：读取 localStorage
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "true") {
      setCollapsed(true)
      document.documentElement.setAttribute("data-admin-collapsed", "true")
    }

    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null
    const mode = savedTheme || "dark"
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
          "fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-border bg-card/95 backdrop-blur-xl transition-all duration-300 ease-in-out md:flex",
          sidebarWidth,
        )}
      >
        {/* 顶部：Logo + 收缩按钮 */}
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          {!collapsed && (
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-foreground transition-all hover:bg-accent/60"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="truncate">返回前台</span>
            </Link>
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

        {/* 导航列表 */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
          <div className="flex flex-col gap-0.5">
            {items.map(({ icon: Icon, label, href }) => {
              const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                    collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5",
                    isActive
                      ? "bg-accent text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={2} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              )
            })}
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
      <nav className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-xl md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <span className="text-sm font-semibold text-foreground">管理后台</span>
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </Link>
      </nav>

      {/* ═══════════ 手机端遮罩 ═══════════ */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 md:hidden",
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
            {items.map(({ icon: Icon, label, href }) => {
              const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href))
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
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                  <span>{label}</span>
                </Link>
              )
            })}
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