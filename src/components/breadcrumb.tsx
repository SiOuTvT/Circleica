"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const ROUTE_NAMES: Record<string, string> = {
  games: "游戏",
  creators: "创作者",
  forum: "求档中心",
  collections: "精选合集",
  profile: "用户",
  search: "搜索",
  login: "登录",
  register: "注册",
  admin: "管理后台",
  characters: "角色",
  announcements: "公告",
  "forgot-password": "找回密码",
  import: "导入",
  comments: "评论",
}

export function Breadcrumb() {
  const pathname = usePathname()
  
  // 首页不显示面包屑
  if (pathname === "/") return null
  
  const segments = pathname.split("/").filter(Boolean)
  
  // 只有一级路径且不是动态参数时才显示
  const crumbs: { label: string; href: string }[] = []
  let currentPath = ""
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    currentPath += `/${seg}`
    
    // 跳过动态参数段（包含 id 的路径）
    const isDynamicParam = /^[a-f0-9]{20,}$/i.test(seg) || seg === "[id]"
    if (isDynamicParam) continue
    
    const label = ROUTE_NAMES[seg] || seg
    crumbs.push({ label, href: currentPath })
  }
  
  // 如果没有有效面包屑项，不显示
  if (crumbs.length === 0) return null

  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/" className="transition-colors hover:text-foreground">
        首页
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" strokeWidth={2} />
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="transition-colors hover:text-foreground">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}