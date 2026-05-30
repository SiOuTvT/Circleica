"use client"

import { cn } from "@/lib/utils"
import { Gamepad2, Home, Layers, MessageSquare, User } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_ITEMS = [
  { icon: Home,         label: "首页",   href: "/" },
  { icon: Gamepad2,     label: "游戏库", href: "/search" },
  { icon: Layers,       label: "合集",   href: "/collections" },
  { icon: MessageSquare, label: "求档",  href: "/forum" },
]

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/80 backdrop-blur-xl safe-area-bottom"
      role="navigation"
      aria-label="移动端导航"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          // 激活判断：首页精确匹配，其他前缀匹配
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-12 rounded-xl transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] leading-tight font-medium">{label}</span>
            </Link>
          )
        })}
        <Link
          href={user ? `/user/${(user as Record<string, unknown>).serialId || user.id}` : "/login"}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 w-16 h-12 rounded-xl transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            pathname.startsWith("/user/") || pathname === "/login"
              ? "text-primary"
              : "text-muted-foreground active:text-foreground"
          )}
          aria-current={pathname.startsWith("/user/") ? "page" : undefined}
        >
          <User className="h-5 w-5" strokeWidth={pathname.startsWith("/user/") ? 2.5 : 2} />
          <span className="text-[10px] leading-tight font-medium">{user ? "我的" : "登录"}</span>
        </Link>
      </div>
    </nav>
  )
}