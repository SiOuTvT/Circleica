"use client"

import { cn } from "@/lib/utils"
import { ArrowLeft, Gamepad2, LayoutDashboard, Megaphone, Menu, Music, Tag, Users, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const items = [
  { icon: LayoutDashboard, label: "仪表盘",   href: "/admin" },
  { icon: Gamepad2,        label: "游戏管理",  href: "/admin/games" },
  { icon: Tag,             label: "标签管理",  href: "/admin/tags" },
  { icon: Megaphone,       label: "公告管理",  href: "/admin/announcements" },
  { icon: Music,           label: "音乐管理",  href: "/admin/music" },
  { icon: Users,           label: "用户管理",  href: "/admin/users" },
]

export function AdminNav() {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      {/* 桌面端导航栏 */}
      <nav className="sticky top-0 z-40 hidden h-14 border-b border-border bg-background/95 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-full max-w-[1300px] items-center gap-1 px-6 lg:ml-[max(calc((100vw-1200px)/2),0px)]">
          <Link href="/" className="mr-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-all">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            前台
          </Link>
          <div className="h-5 w-px bg-border mr-1" />
          {items.map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap",
                pathname === href
                  ? "bg-accent text-foreground ring-1 ring-border"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* 手机端顶部栏 */}
      <nav className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-xl md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Menu className="h-6 w-6" strokeWidth={2.5} />
        </button>
        <span className="text-sm font-semibold text-foreground">管理后台</span>
        <Link href="/" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </Link>
      </nav>

      {/* 手机端侧边栏遮罩 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* 手机端侧边栏 */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-64 bg-background shadow-xl transition-transform duration-300 ease-out md:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold text-foreground">管理后台</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {items.map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                pathname === href
                  ? "bg-gradient-to-r from-blue-500/20 to-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="h-6 w-6 shrink-0" strokeWidth={2.5} />
              {label}
            </Link>
          ))}
        </div>
      </aside>
    </>
  )
}
