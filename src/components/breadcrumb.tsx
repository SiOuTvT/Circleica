"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useBreadcrumb } from "./breadcrumb-context"

/**
 * 路由段 → 中文名映射（仅用于有独立页面的路由）
 * ⚠️ 不要把没有独立页面的路由（如 games, profile, creators, announcements, characters）加进来
 */
const ROUTE_NAMES: Record<string, string> = {
  forum: "求档区",
  collections: "精选合集",
  credits: "制作组图鉴",
  search: "搜索",
  login: "登录",
  register: "注册",
  admin: "管理后台",
  "forgot-password": "找回密码",
  "reset-password": "重置密码",
  profile: "个人中心",
  edit: "编辑资料",
  notifications: "消息通知",
  // admin 子页面
  users: "用户管理",
  games: "游戏管理",
  theme: "主题设置",
  announcements: "公告管理",
  music: "音乐管理",
  tags: "标签管理",
  all: "全部标签",
  "tag-groups": "标签组管理",
  reports: "举报管理",
  import: "导入",
  new: "新增",
  checkins: "签到管理",
  favorites: "收藏管理",
  follows: "关注管理",
  creators: "创作者管理",
  "emotional-messages": "情感消息管理",
  "site-settings": "站点设置",
  "avatar-frames": "头像框管理",
  "resource-tags": "资源标签",
  achievements: "成就管理",
}

/**
 * 没有独立列表页面的虚拟前缀段
 * 例如 /games/[id] 中的 "games" 没有对应的 /games 列表页
 */
const VIRTUAL_PREFIXES = new Set([
  "games",
  "creators",
  "announcements",
  "characters",
  "user",
])

/** 清洗标签：去掉书名号、括号等修饰符号 */
function cleanLabel(label: string): string {
  return label
    .replace(/[《》「」『』【】\[\]()（）]/g, "")
    .replace(/["""']/g, "")
    .trim()
}

/** 检测是否为动态参数段（ID） */
function isDynamicSegment(seg: string): boolean {
  // MongoDB ObjectId: 24位十六进制
  if (/^[a-f0-9]{24}$/i.test(seg)) return true
  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(seg)) return true
  // CUID / NanoID 等长随机串（20+字符，字母数字混合）
  if (/^[a-z0-9_-]{20,}$/i.test(seg)) return true
  // 纯数字 ID（如 serialId 1, 2, 12345）
  if (/^\d+$/.test(seg)) return true
  // VNDB 风格 ID（如 s123, p456）
  if (/^[sp]\d+$/i.test(seg)) return true
  return false
}

interface CrumbResult {
  label: string
  href: string
  isCurrent: boolean
}

/**
 * 特殊页面路径处理规则
 * key = 路径前缀，value = 自定义面包屑生成函数
 */
function buildSpecialCrumbs(
  segments: string[],
  pathname: string,
  dynamicLabels: Record<string, string>
): CrumbResult[] | null {
  // /profile/[id] → 首页 › [username] 的主页
  if (segments[0] === "profile" && segments.length === 2 && isDynamicSegment(segments[1])) {
    const label = dynamicLabels[segments[1]]
    if (label) {
      return [{ label: `${cleanLabel(label)} 的主页`, href: pathname, isCurrent: true }]
    }
    // 没有动态标签时不显示面包屑（避免暴露 ID）
    return []
  }

  // /user/[id] → 首页 › [username] 的主页
  if (segments[0] === "user" && segments.length === 2 && isDynamicSegment(segments[1])) {
    const label = dynamicLabels[segments[1]]
    if (label) {
      return [{ label: `${cleanLabel(label)} 的主页`, href: pathname, isCurrent: true }]
    }
    return []
  }

  // /profile/edit → 首页 › [父级?] › 编辑资料
  if (segments[0] === "profile" && segments[1] === "edit") {
    return [{ label: "编辑资料", href: "/profile/edit", isCurrent: true }]
  }

  // /games/[id] → 首页 › [game title]
  if (segments[0] === "games" && segments.length === 2 && isDynamicSegment(segments[1])) {
    const label = dynamicLabels[segments[1]]
    if (label) {
      return [{ label: cleanLabel(label), href: pathname, isCurrent: true }]
    }
    return []
  }

  // /creators/[id] → 首页 › [creator name]
  if (segments[0] === "creators" && segments.length === 2 && isDynamicSegment(segments[1])) {
    const label = dynamicLabels[segments[1]]
    if (label) {
      return [{ label: cleanLabel(label), href: pathname, isCurrent: true }]
    }
    return []
  }

  // /announcements/[id] → 首页 › [title]
  if (segments[0] === "announcements" && segments.length === 2 && isDynamicSegment(segments[1])) {
    const label = dynamicLabels[segments[1]]
    if (label) {
      return [{ label: cleanLabel(label), href: pathname, isCurrent: true }]
    }
    return []
  }

  // /characters/[id] → 首页 › [name]
  if (segments[0] === "characters" && segments.length === 2 && isDynamicSegment(segments[1])) {
    const label = dynamicLabels[segments[1]]
    if (label) {
      return [{ label: cleanLabel(label), href: pathname, isCurrent: true }]
    }
    return []
  }

  return null // 不是特殊路径，走通用逻辑
}

/** 面包屑项渲染 */
function CrumbSeparator() {
  return (
    <ChevronRight
      className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground/40"
      strokeWidth={2}
    />
  )
}

export function Breadcrumb() {
  const pathname = usePathname()
  const { dynamicLabels, parentCrumbs } = useBreadcrumb()

  // 首页不显示面包屑
  if (pathname === "/") return null

  const segments = pathname.split("/").filter(Boolean)

  // 优先尝试特殊路径处理
  const specialCrumbs = buildSpecialCrumbs(segments, pathname, dynamicLabels)
  if (specialCrumbs !== null) {
    if (specialCrumbs.length === 0 && parentCrumbs.length === 0) return null
    // 合并父级 + 特殊面包屑
    const allCrumbs = [
      ...parentCrumbs.map((pc) => ({ label: pc.label, href: pc.href, isLink: true })),
      ...specialCrumbs.map((sc) => ({ label: sc.label, href: sc.href, isLink: false })),
    ]
    if (allCrumbs.length === 0) return null
    return (
      <nav className="my-2 lg:my-4 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-sm text-gray-500 leading-none" aria-label="面包屑导航">
        <Link
          href="/"
          className="inline-flex items-center shrink-0 leading-none transition-colors hover:text-foreground"
        >
          首页
        </Link>
        {allCrumbs.map((crumb, i) => {
          const isLast = i === allCrumbs.length - 1
          return (
            <span key={`${crumb.href}-${i}`} className="inline-flex shrink-0 items-center gap-1.5 leading-none">
              <CrumbSeparator />
              {isLast ? (
                <span className="inline-flex items-center font-medium leading-none max-w-[180px] sm:max-w-[280px] truncate" title={crumb.label}>
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="inline-flex items-center leading-none transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>
    )
  }

  // ── 通用面包屑逻辑 ──
  const crumbs: { label: string; href: string }[] = []
  let currentPath = ""

  // 检测是否在 admin 上下文中
  const isAdmin = segments[0] === "admin"

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    currentPath += `/${seg}`

    // 跳过虚拟前缀段（没有独立页面的路由），但在 admin 上下文中不跳过（admin 下都有独立页面）
    if (VIRTUAL_PREFIXES.has(seg) && i < segments.length - 1 && !isAdmin) {
      continue
    }

    // 动态参数段：从上下文获取标签
    if (isDynamicSegment(seg)) {
      const dynamicLabel = dynamicLabels[seg]
      if (dynamicLabel) {
        crumbs.push({ label: cleanLabel(dynamicLabel), href: currentPath })
      }
      // 没有标签则跳过（不暴露 ID）
      continue
    }

    // 静态路由段：查映射表
    const label = ROUTE_NAMES[seg]
    if (label) {
      crumbs.push({ label, href: currentPath })
    }
    // 未映射的段直接跳过（避免显示英文路由）
  }

  // 合并父级面包屑 + 通用面包屑
  const allCrumbs = [
    ...parentCrumbs.map((pc) => ({ label: pc.label, href: pc.href })),
    ...crumbs,
  ]

  // 没有有效面包屑项则不显示
  if (allCrumbs.length === 0) return null

  return (
    <nav className="my-3 lg:my-6 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-sm leading-none" aria-label="面包屑导航">
      <Link
        href="/"
        className="inline-flex items-center shrink-0 leading-none text-muted-foreground transition-colors hover:text-foreground"
      >
        首页
      </Link>
      {allCrumbs.map((crumb, i) => {
        const isLast = i === allCrumbs.length - 1
        return (
          <span key={`${crumb.href}-${i}`} className="inline-flex shrink-0 items-center gap-1.5 leading-none">
            <CrumbSeparator />
            {isLast ? (
              <span className="inline-flex items-center font-medium leading-none max-w-[180px] sm:max-w-[280px] truncate" title={crumb.label}>
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="inline-flex items-center leading-none text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}