"use client"

import { cn } from "@/lib/utils"
import {
  Compass,
  Home,
  Layers,
  Tag,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

const NAV_SECTIONS = [
  {
    label: "发现",
    items: [
      { icon: Home, label: "首页", href: "/" },
      { icon: Users, label: "制作组图鉴", href: "/credits" },
      { icon: Layers, label: "精选合集", href: "/collections" },
      { icon: Tag, label: "标签浏览", href: "/tags" },
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
  const router = useRouter()
  const [randomLoading, setRandomLoading] = useState(false)

  const handleRandomDiscover = useCallback(async () => {
    if (randomLoading) return
    setRandomLoading(true)
    try {
      const res = await fetch("/api/games/random")
      if (!res.ok) throw new Error("获取失败")
      const data = await res.json()
      router.push(`/games/${data.serialId}`)
    } catch {
      // 静默失败
    } finally {
      setRandomLoading(false)
    }
  }, [randomLoading, router])

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
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
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
          width: collapsed ? 60 : expanded ? 240 : mobileOpen ? 180 : 200,
        }}
      >
        <nav className="flex flex-col gap-1 overflow-y-auto overflow-x-hidden h-full px-2 py-3 lg:py-3">
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
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}

          {/* 随机发现 */}
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
              <Compass className={cn("h-5 w-5 shrink-0", randomLoading && "animate-spin")} strokeWidth={2} />
              {!collapsed && <span>{randomLoading ? "发现中..." : "随机发现"}</span>}
            </button>
          </div>
        </nav>
      </aside>
    </>
  )
}
