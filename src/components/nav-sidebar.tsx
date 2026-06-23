"use client"

import { cn } from "@/lib/utils"
import {
  Compass,
  Flame,
  Home,
  Layers,
  Tag,
  Users,
} from "lucide-react"
import Image from "next/image"
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

interface ForumPost {
  id: string
  title: string
  user: { username: string }
  isSolved: boolean
  createdAt: string
}

interface HotGame {
  id: string
  serialId: number
  title: string
  coverImage: string | null
  favoriteCount: number
}

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
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [hotGames, setHotGames] = useState<HotGame[]>([])
  const [randomLoading, setRandomLoading] = useState(false)
  const dataFetched = useRef(false)

  // 桌面端立即加载，移动端等侧边栏首次打开时再加载
  useEffect(() => {
    if (dataFetched.current) return
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches
    if (!isDesktop && !mobileOpen) return
    dataFetched.current = true
    fetch("/api/forum/posts")
      .then(r => r.json())
      .then(data => setForumPosts((data || []).slice(0, 5)))
      .catch(() => {})
    fetch("/api/games?sort=popular&limit=8")
      .then(r => r.json())
      .then(data => setHotGames((data.games || []).slice(0, 8)))
      .catch(() => {})
  }, [mobileOpen])

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
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
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
        {/* 导航列表 - flex column, 底部放折叠按钮 */}
        <nav className="flex flex-col overflow-y-auto overflow-x-hidden px-2 py-3 h-full" style={{ width: collapsed ? 60 : (expanded ? 240 : 200) }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-2">
              {section.items.map(({ icon: Icon, label, href }) => {
                const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center rounded-lg py-2.5 font-medium transition-all whitespace-nowrap",
                      collapsed ? "justify-center px-0 mx-auto w-11 h-11 text-sm" : "gap-3 px-3 text-[15px]",
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
          <div className="mb-2">
            <button
              onClick={handleRandomDiscover}
              disabled={randomLoading}
              className={cn(
                "flex items-center rounded-lg py-2.5 font-medium transition-all whitespace-nowrap w-full",
                collapsed ? "justify-center px-0 mx-auto w-11 h-11 text-sm" : "gap-3 px-3 text-[15px]",
                "text-muted-foreground hover:bg-accent/60 hover:text-foreground disabled:opacity-50"
              )}
              title={collapsed ? "随机发现" : undefined}
            >
              <Compass className={cn("h-5 w-5 shrink-0", randomLoading && "animate-spin")} strokeWidth={2} />
              {!collapsed && <span>{randomLoading ? "发现中..." : "随机发现"}</span>}
            </button>
          </div>

          {/* 社区动态 */}
          {forumPosts.length > 0 && !collapsed && (
            <div className="border-t border-border pt-3 mt-3">
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 whitespace-nowrap">
                社区动态
              </p>
              {forumPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/forum?post=${post.id}`}
                  className="block px-2 py-1.5 rounded-lg hover:bg-accent/40 transition-colors"
                >
                  <p className="text-xs text-foreground truncate whitespace-nowrap">{post.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                    {post.user.username} · {post.isSolved ? "已解决" : "未解决"}
                  </p>
                </Link>
              ))}
              <Link
                href="/forum"
                className="block px-2 py-1.5 text-xs text-primary hover:underline mt-1 whitespace-nowrap"
              >
                查看全部 →
              </Link>
            </div>
          )}

          {/* 热门游戏 */}
          {hotGames.length > 0 && !collapsed && (
            <div className="border-t border-border pt-3 mt-3">
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 whitespace-nowrap flex items-center gap-1">
                <Flame className="h-3 w-3" strokeWidth={2} />热门游戏
              </p>
              <div className="space-y-0.5">
                {hotGames.map((game, i) => (
                  <Link
                    key={game.id}
                    href={`/games/${game.serialId}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/40 transition-colors group"
                  >
                    <span className={cn(
                      "w-4 text-[10px] font-bold text-right shrink-0",
                      i < 3 ? "text-amber-400" : "text-muted-foreground/50"
                    )}>{i + 1}</span>
                    {game.coverImage ? (
                      <Image src={game.coverImage} alt="" width={28} height={36} className="h-9 w-7 rounded object-cover shrink-0" unoptimized />
                    ) : (
                      <div className="h-9 w-7 rounded bg-muted shrink-0 flex items-center justify-center">
                        <Flame className="h-3 w-3 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">{game.title}</p>
                      <p className="text-[10px] text-muted-foreground">{game.favoriteCount} 收藏</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  )
}
