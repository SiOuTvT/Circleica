"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useBreadcrumb } from "./breadcrumb-context"

const ROUTE_NAMES: Record<string, string> = {
  games: "游戏",
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
  const { dynamicLabels } = useBreadcrumb()
  
  // 首页不显示面包屑
  if (pathname === "/") return null
  
  const segments = pathname.split("/").filter(Boolean)
  
  const crumbs: { label: string; href: string }[] = []
  let currentPath = ""
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    currentPath += `/${seg}`
    
    // 检查是否是动态参数段
    const isDynamicParam = /^[a-z0-9]{20,}$/i.test(seg) || /^[0-9a-f]{8}-/.test(seg)
    
    if (isDynamicParam) {
      // 尝试从上下文获取动态标签
      const dynamicLabel = dynamicLabels[seg]
      if (dynamicLabel) {
        crumbs.push({ label: dynamicLabel, href: currentPath })
      }
      // 如果没有动态标签，跳过该段（不显示ID）
      continue
    }
    
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