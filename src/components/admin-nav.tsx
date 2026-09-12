"use client"

import { Badge } from "@/components/ui/badge"
import { ROLE_META } from "@/lib/permissions"
import type { UserRole } from "@/lib/admin"
import { cn } from "@/lib/utils"
import { api, unwrapApiData } from "@/lib/api-client"
import Image from "next/image"
import {
  ArrowLeft, Award, BookOpen, Building2, CalendarCheck, ChevronLeft, ChevronRight, ClipboardCheck, Download, FileCode, FileText, Flag, FolderTree, Frame, Gauge, Gamepad2, Heart, ImageOff, Inbox,
  Layers, List, Megaphone, Menu, MessageSquare, Moon, Music, Palette, Paintbrush,
  PenTool, Search, Server, Settings, Shield, ShieldAlert, SmilePlus, Star, Sun, Tag, UserPlus, Users, X, CopyCheck,
} from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

type SiteKey = "circleica" | "galvelica"

interface NavItem {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  href: string
  minRole: UserRole
  /** 栏目归属：circleica=主站 / galvelica=副站 */
  site: SiteKey
}

interface NavGroup {
  label?: string
  items: NavItem[]
  /** 系统级分组（平台配置：用户 / 站点设置 / 审计日志…）：
   *  条目全部归属主站，因此只在 circleica 视图渲染；它不再钉在底部，而是滚动容器里的最后一个分组。 */
  system?: boolean
}

/**
 * 滚动区分组与顺序 = 使用频率重排（期 1 补漏定案，勿自行发明顺序）：
 *   主站：概览 / 内容 / 社区与数据 / 系统
 *   副站：概览 / 数据 / 采集与治理（系统组只属主站，副站视图不渲染）
 * 「系统」永远在数组末尾 → 渲染时即为滚动流的最后一个分组。
 * 底部固定区只剩 4 个工具（搜索 / 返回前台 / 主题 / 角色徽标）。
 */
const navGroups: NavGroup[] = [
  {
    label: "概览",
    items: [
      { icon: Gauge, label: "仪表盘", href: "/admin", minRole: "ADMIN", site: "circleica" },
      { icon: ClipboardCheck, label: "审核队列", href: "/admin/review", minRole: "ADMIN", site: "circleica" },
      { icon: Flag, label: "举报", href: "/admin/reports", minRole: "ADMIN", site: "circleica" },
      { icon: Inbox, label: "收录申请", href: "/admin/inclusion-requests", minRole: "ADMIN", site: "circleica" },
    ],
  },
  {
    label: "内容",
    items: [
      { icon: Gamepad2, label: "游戏", href: "/admin/games", minRole: "ADMIN", site: "circleica" },
      { icon: Tag, label: "标签管理", href: "/admin/tags", minRole: "ADMIN", site: "circleica" },
      { icon: PenTool, label: "创作者", href: "/admin/creators", minRole: "ADMIN", site: "circleica" },
      { icon: Megaphone, label: "公告", href: "/admin/announcements", minRole: "ADMIN", site: "circleica" },
      { icon: List, label: "精选合集", href: "/admin/collections", minRole: "ADMIN", site: "circleica" },
    ],
  },
  {
    label: "社区与数据",
    items: [
      { icon: MessageSquare, label: "论坛", href: "/admin/forum", minRole: "ADMIN", site: "circleica" },
      { icon: CalendarCheck, label: "签到记录", href: "/admin/checkins", minRole: "ADMIN", site: "circleica" },
      { icon: Heart, label: "收藏数据", href: "/admin/favorites", minRole: "ADMIN", site: "circleica" },
      { icon: UserPlus, label: "关注关系", href: "/admin/follows", minRole: "ADMIN", site: "circleica" },
      { icon: Star, label: "评分数据", href: "/admin/ratings", minRole: "ADMIN", site: "circleica" },
      { icon: Music, label: "音乐", href: "/admin/music", minRole: "ADMIN", site: "circleica" },
      { icon: Download, label: "游戏资源", href: "/admin/game-resources", minRole: "ADMIN", site: "circleica" },
      { icon: FolderTree, label: "资源标签", href: "/admin/resource-tags", minRole: "SUPER_ADMIN", site: "circleica" },
    ],
  },
  {
    label: "概览",
    items: [
      { icon: BookOpen, label: "副站概览", href: "/admin/galvelica", minRole: "ADMIN", site: "galvelica" },
      { icon: Layers, label: "作品管理", href: "/admin/galvelica/works", minRole: "ADMIN", site: "galvelica" },
      { icon: Inbox, label: "收录审核", href: "/admin/galvelica/inclusion", minRole: "ADMIN", site: "galvelica" },
      { icon: CopyCheck, label: "重复检测", href: "/admin/galvelica/duplicates", minRole: "ADMIN", site: "galvelica" },
    ],
  },
  {
    label: "数据",
    items: [
      { icon: Tag, label: "标签管理", href: "/admin/galvelica/tags", minRole: "ADMIN", site: "galvelica" },
      { icon: PenTool, label: "创作者", href: "/admin/galvelica/creators", minRole: "ADMIN", site: "galvelica" },
      { icon: ImageOff, label: "封面 NSFW 审核", href: "/admin/galvelica/nsfw-review", minRole: "ADMIN", site: "galvelica" },
      { icon: Building2, label: "商业作品归档", href: "/admin/galvelica/commercial", minRole: "ADMIN", site: "galvelica" },
    ],
  },
  {
    label: "采集与治理",
    items: [
      { icon: Download, label: "手动拉取", href: "/admin/galvelica/fetch", minRole: "ADMIN", site: "galvelica" },
      { icon: ShieldAlert, label: "数据治理", href: "/admin/galvelica/governance", minRole: "ADMIN", site: "galvelica" },
      { icon: Paintbrush, label: "副站主题", href: "/admin/galvelica/theme", minRole: "ADMIN", site: "galvelica" },
    ],
  },
  {
    label: "系统",
    system: true,
    items: [
      { icon: Users, label: "用户", href: "/admin/users", minRole: "SUPER_ADMIN", site: "circleica" },
      { icon: Settings, label: "站点设置", href: "/admin/site-settings", minRole: "SUPER_ADMIN", site: "circleica" },
      { icon: FileCode, label: "页面管理", href: "/admin/pages", minRole: "SUPER_ADMIN", site: "circleica" },
      { icon: Palette, label: "主题设置", href: "/admin/theme", minRole: "SUPER_ADMIN", site: "circleica" },
      { icon: Award, label: "成就", href: "/admin/achievements", minRole: "SUPER_ADMIN", site: "circleica" },
      { icon: Frame, label: "头像框", href: "/admin/avatar-frames", minRole: "SUPER_ADMIN", site: "circleica" },
      { icon: SmilePlus, label: "情感消息", href: "/admin/emotional-messages", minRole: "SUPER_ADMIN", site: "circleica" },
      { icon: Server, label: "服务配置", href: "/admin/services", minRole: "SUPER_ADMIN", site: "circleica" },
      { icon: FileText, label: "审计日志", href: "/admin/audit-logs", minRole: "ADMIN", site: "circleica" },
    ],
  },
]

/**
 * 后台顶栏面包屑解析：按 href 最长前缀匹配当前路径 → 返回 { 当前页, 所在分组, 归属站点 }。
 * 供 AdminTopBar 复用同一份导航配置，避免面包屑与侧栏两处维护、各自漂移。
 */
export function resolveAdminNavItem(pathname: string): {
  label: string
  groupLabel: string
  site: SiteKey
} | null {
  let best: { item: NavItem; group: NavGroup } | null = null
  for (const group of navGroups) {
    for (const item of group.items) {
      const match = pathname === item.href || pathname.startsWith(item.href + "/")
      if (!match) continue
      if (!best || item.href.length > best.item.href.length) best = { item, group }
    }
  }
  if (!best) return null
  return { label: best.item.label, groupLabel: best.group.label ?? "后台", site: best.item.site }
}

// 根型条目：它们是其余子页的路径前缀，按前缀匹配会和子页一起高亮（一个侧栏亮两项）。
// 这两个只能精确匹配；其余条目一律用 href + "/" 前缀匹配，
// 避免 /admin/tags 误配 /admin/tags-all 这类同前缀路径。
const EXACT_ONLY = ["/admin", "/admin/galvelica"]

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

/** 导航项：32px 高 / 13px 字（text-sm 经后台收档层落到 13px）/ 控件圆角 6px */
const ITEM_BASE =
  "group relative flex h-8 shrink-0 items-center gap-3 rounded-[var(--admin-radius-ctl)] text-sm font-medium transition-colors"

/** 底部工具项：32×32 可点热区（≥28px 下限），图标 16px */
const TOOL_BASE =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--admin-radius-ctl)] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"

function NavItemRow({
  item,
  isActive,
  accent,
  accentSoft,
  collapsed,
  badge,
  onNavigate,
}: {
  item: NavItem
  isActive: boolean
  accent: string
  accentSoft: string
  collapsed: boolean
  badge: number
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        ITEM_BASE,
        collapsed ? "justify-center px-0" : "px-3",
        isActive ? "text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
      )}
      style={isActive ? { backgroundColor: accentSoft } : undefined}
    >
      {/* 选中态①：左侧 2px 色条（条本身不设圆角，避免产生非收纳档位的半径） */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-0.5"
        style={{ backgroundColor: isActive ? accent : "transparent" }}
      />
      <span className="relative">
        <Icon
          className={cn("h-4 w-4 shrink-0", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}
          strokeWidth={2}
        />
        {badge > 0 && (
          <Badge variant="destructive-solid" size="sm" className="absolute -top-1 -right-1">
            {badge > 99 ? "99+" : badge}
          </Badge>
        )}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

/** 分组标题：11/600 + 沿用 eyebrow 字距，与下面条目间隔 16px */
function GroupLabel({ text, collapsed }: { text: string; collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="px-3 pt-4 pb-4">
        <div className="h-px bg-border" />
      </div>
    )
  }
  return (
    <div className="px-3 pt-4 pb-4">
      <span className="text-micro font-semibold uppercase tracking-wider text-muted-foreground/70">
        {text}
      </span>
    </div>
  )
}

export function AdminNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = (session?.user as Record<string, unknown>)?.role as string ?? "USER"
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark")
  const [mounted, setMounted] = useState(false)
  const [badgeCounts, setBadgeCounts] = useState<{ reports: number; unpublishedGames: number; inclusionDrafts: number }>({ reports: 0, unpublishedGames: 0, inclusionDrafts: 0 })

  // 默认视图按当前路径判定；点切换器只换视图、不做路由跳转（后续路由变化再同步一次）
  const siteFromPath = pathname.startsWith("/admin/galvelica") ? "galvelica" : "circleica"
  const [siteView, setSiteView] = useState<SiteKey>(siteFromPath)

  // 获取待办数量
  useEffect(() => {
    api.get<{ success?: boolean; data?: { reports?: number; unpublishedGames?: number; inclusionDrafts?: number } }>("/api/admin/counts")
      .then((res) => {
        const data = unwrapApiData<{ reports?: number; unpublishedGames?: number; inclusionDrafts?: number }>(res) ?? {}
        setBadgeCounts({ reports: data.reports ?? 0, unpublishedGames: data.unpublishedGames ?? 0, inclusionDrafts: data.inclusionDrafts ?? 0 })
      })
      .catch(() => {})
  }, [])

  // 路由变化后同步站点视图（例如从副站页面点回主站入口）
  useEffect(() => {
    setSiteView(pathname.startsWith("/admin/galvelica") ? "galvelica" : "circleica")
  }, [pathname])

  // 同步给后台顶栏（AdminTopBar）：面包屑随主副站切换器联动，切换不改变路由
  useEffect(() => {
    document.documentElement.setAttribute("data-admin-site", siteView)
    window.dispatchEvent(new Event("admin-site-view"))
  }, [siteView])

  const currentSite = siteView

  const visibleGroups = useMemo(
    () => navGroups.map(g => ({
      ...g,
      // 一切分组（含系统组）都按站点过滤：系统组条目全为 circleica，副站视图下整组自然被滤空
      items: g.items.filter(item =>
        (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[item.minRole] ?? 0) &&
        item.site === currentSite
      ),
    })).filter(g => g.items.length > 0),
    [userRole, currentSite]
  )

  // 选中态配色：副站视图跟 --gal-accent，主站跟 --primary（均为变量，不硬编码色值）
  const accent = currentSite === "galvelica" ? "var(--gal-accent)" : "var(--primary)"
  const accentSoft = currentSite === "galvelica" ? "var(--gal-accent-soft)" : "var(--primary-soft)"

  // 根据 href 返回待办数量
  const getBadgeCount = (href: string): number => {
    if (href === "/admin/reports") return badgeCounts.reports
    if (href === "/admin/games") return badgeCounts.unpublishedGames
    if (href === "/admin/inclusion-requests") return badgeCounts.inclusionDrafts
    return 0
  }

  const isActive = (href: string) =>
    EXACT_ONLY.includes(href)
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/")

  // 初始化：读取 localStorage
  useEffect(() => {
    setMounted(true)
    // 后台收档层的第二条作用域（第一条 .admin-scope 已由服务端渲染在布局根容器上，首帧即生效）。
    // 这里补 body 属性是为了兜住 portal：Radix 的 Dialog / Popover / Dropdown 等浮层
    // 会被挂到 document.body 下，在 .admin-scope 容器之外，只有 body 选择器能命中它们。
    // 只有 /admin/** 会挂载本组件，前台不置该属性。
    document.body.setAttribute("data-admin-scope", "true")
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
    return () => {
      mq.removeEventListener("change", handler)
      document.body.removeAttribute("data-admin-scope")
    }
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

  const roleLabel = ROLE_META[userRole as UserRole]?.label ?? "管理员"
  const themeTitle =
    themeMode === "dark" ? "当前：深色模式（点击切换）" :
    themeMode === "light" ? "当前：浅色模式（点击切换）" :
    "当前：跟随系统（点击切换）"

  const triggerSearch = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
  }

  const themeIcon = (
    <>
      {mounted && themeMode === "dark" && <Moon className="h-4 w-4" strokeWidth={2} />}
      {mounted && themeMode === "light" && <Sun className="h-4 w-4" strokeWidth={2} />}
      {mounted && themeMode === "system" && (
        <span className="relative flex h-4 w-4 items-center justify-center">
          <Sun className="absolute h-4 w-4 opacity-50" strokeWidth={2} />
          <Moon className="absolute size-2.5 translate-x-[1px] -translate-y-[1px]" strokeWidth={2} />
        </span>
      )}
    </>
  )

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
        {/* 顶部固定区①：用户 + 收缩按钮 */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-3">
          {!collapsed ? (
            <div className="flex items-center gap-2 min-w-0 px-2 py-2">
              {session?.user?.image ? (
                <Image src={session.user.image} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" unoptimized />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/80 text-sm font-bold text-primary-foreground">
                  {session?.user?.name?.charAt(0)?.toUpperCase() || "A"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{session?.user?.name || "管理员"}</p>
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
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--admin-radius-ctl)] text-muted-foreground transition duration-150 ease-in-out hover:bg-accent hover:text-foreground",
              collapsed && "mx-auto"
            )}
            title={collapsed ? "展开侧边栏" : "收缩侧边栏"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" strokeWidth={2} /> : <ChevronLeft className="h-4 w-4" strokeWidth={2} />}
          </button>
        </div>

        {/* 顶部固定区②：站点切换器（只切换视图，不做路由跳转） */}
        {!collapsed && (
          <div className="shrink-0 px-3 pt-2">
            <div className="flex rounded-[var(--admin-radius-ctl)] bg-muted/50 p-1 text-micro font-medium">
              <button
                type="button"
                onClick={() => setSiteView("circleica")}
                className={cn(
                  "flex-1 min-h-[28px] rounded-[var(--admin-radius-ctl)] px-2 py-1 text-center transition-colors",
                  currentSite === "circleica"
                    ? "bg-background text-foreground ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Circleica
              </button>
              <button
                type="button"
                onClick={() => setSiteView("galvelica")}
                className={cn(
                  "flex-1 min-h-[28px] rounded-[var(--admin-radius-ctl)] px-2 py-1 text-center transition-colors",
                  currentSite === "galvelica"
                    ? "bg-background text-foreground ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Galvelica
              </button>
            </div>
          </div>
        )}

        {/* 滚动区：除顶部两块外一切内容都在这里，含末尾的「系统」组 */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2">
          <div className="flex flex-col gap-1">
            {visibleGroups.map((group, gi) => (
              <div key={`${group.label ?? "g"}-${gi}`}>
                {group.label && <GroupLabel text={group.label} collapsed={collapsed} />}
                {group.items.map((item) => (
                  <NavItemRow
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    accent={accent}
                    accentSoft={accentSoft}
                    collapsed={collapsed}
                    badge={getBadgeCount(item.href)}
                  />
                ))}
              </div>
            ))}
          </div>
        </nav>

        {/* 底部固定区：只有 4 个工具，整块 48px（py-2 + 32px 项高） */}
        <div className="shrink-0 border-t border-border px-2 py-2">
          <div className={cn("flex gap-1", collapsed ? "flex-col items-center" : "items-center justify-between")}>
            <button
              type="button"
              onClick={triggerSearch}
              title="全局搜索 (Ctrl+K)"
              aria-label="全局搜索"
              className={TOOL_BASE}
            >
              <Search className="h-4 w-4" strokeWidth={2} />
            </button>
            <Link href="/" title="返回前台" aria-label="返回前台" className={TOOL_BASE}>
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </Link>
            <button type="button" onClick={cycleTheme} title={themeTitle} aria-label={themeTitle} className={TOOL_BASE}>
              {themeIcon}
            </button>
            <div title={`角色：${roleLabel}`} aria-label={`角色：${roleLabel}`} className={cn(TOOL_BASE, "cursor-default hover:bg-transparent")}>
              <Shield className="h-4 w-4" strokeWidth={2} />
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════ 手机端顶部栏 ═══════════ */}
      <nav className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-lg md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--admin-radius-ctl)] text-muted-foreground hover:bg-accent hover:text-foreground transition duration-150 ease-in-out"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <span className="text-sm font-semibold text-foreground">管理后台</span>
        <div className="flex items-center gap-1">
          <button
            onClick={triggerSearch}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--admin-radius-ctl)] text-muted-foreground hover:bg-accent hover:text-foreground transition duration-150 ease-in-out"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
          </button>
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--admin-radius-ctl)] text-muted-foreground hover:bg-accent hover:text-foreground transition duration-150 ease-in-out"
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
          "fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col bg-card shadow-4 transition-transform duration-200 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 顶部固定区①：标题 + 关闭 */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold text-foreground">管理后台</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--admin-radius-ctl)] text-muted-foreground hover:bg-accent hover:text-foreground transition duration-150 ease-in-out"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* 顶部固定区②：站点切换器（与桌面端同一份视图状态） */}
        <div className="shrink-0 px-3 pt-2">
          <div className="flex rounded-[var(--admin-radius-ctl)] bg-muted/50 p-1 text-micro font-medium">
            <button
              type="button"
              onClick={() => setSiteView("circleica")}
              className={cn(
                "flex-1 min-h-[28px] rounded-[var(--admin-radius-ctl)] px-2 py-1 text-center transition-colors",
                currentSite === "circleica"
                  ? "bg-background text-foreground ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Circleica
            </button>
            <button
              type="button"
              onClick={() => setSiteView("galvelica")}
              className={cn(
                "flex-1 min-h-[28px] rounded-[var(--admin-radius-ctl)] px-2 py-1 text-center transition-colors",
                currentSite === "galvelica"
                  ? "bg-background text-foreground ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Galvelica
            </button>
          </div>
        </div>

        {/* 滚动区（与桌面端同一份 visibleGroups，含末尾「系统」） */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-2">
          <div className="flex flex-col gap-1">
            {visibleGroups.map((group, gi) => (
              <div key={`${group.label ?? "g"}-${gi}`}>
                {group.label && <GroupLabel text={group.label} collapsed={false} />}
                {group.items.map((item) => (
                  <NavItemRow
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    accent={accent}
                    accentSoft={accentSoft}
                    collapsed={false}
                    badge={getBadgeCount(item.href)}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            ))}
          </div>
        </nav>

        {/* 底部固定区：同款 4 个工具（窄屏排一行，260px 放得下） */}
        <div className="shrink-0 border-t border-border px-2 py-2">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={triggerSearch}
              title="全局搜索 (Ctrl+K)"
              aria-label="全局搜索"
              className={TOOL_BASE}
            >
              <Search className="h-4 w-4" strokeWidth={2} />
            </button>
            <Link href="/" title="返回前台" aria-label="返回前台" className={TOOL_BASE} onClick={() => setMobileOpen(false)}>
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </Link>
            <button type="button" onClick={cycleTheme} title={themeTitle} aria-label={themeTitle} className={TOOL_BASE}>
              {themeIcon}
            </button>
            <div title={`角色：${roleLabel}`} aria-label={`角色：${roleLabel}`} className={cn(TOOL_BASE, "cursor-default hover:bg-transparent")}>
              <Shield className="h-4 w-4" strokeWidth={2} />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
