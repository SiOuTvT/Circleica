"use client"

import { cn } from "@/lib/utils"
import {
  CalendarCheck,
  FileQuestion,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Search,
  ShieldAlert,
  Sun,
  User,
  UserCircle2,
  X,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const MENU_ITEMS = [
  { icon: Layers,       label: "精选合集", href: "/collections" },
  { icon: FileQuestion, label: "求档中心", href: "/forum" },
  { icon: UserCircle2,  label: "创作者",   href: "/creators" },
]

function getCookie(name: string) {
  if (typeof document === "undefined") return null
  return document.cookie.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="))?.split("=")[1] ?? null
}
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=31536000`
}

export function TopNav() {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user

  const [menuOpen, setMenuOpen]   = useState(false)
  const [userOpen, setUserOpen]   = useState(false)
  const [forumOpen, setForumOpen] = useState(false)
  const [theme, setTheme]         = useState<"dark" | "light">("dark")
  const [nsfw, setNsfw]           = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null
    const t = savedTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    setTheme(t)
    document.documentElement.classList.toggle("light", t === "light")

    const nsfwVal = getCookie("nsfw_status") === "1"
    setNsfw(nsfwVal)

    // 签到状态完全依赖后端，不再使用 localStorage
    fetch("/api/checkin")
      .then(r => r.json())
      .then(data => setCheckedIn(data.checkedIn))
      .catch(() => setCheckedIn(false))
  }, [])

  // 点击外部关闭下拉，用 mousedown 避免与 click 冲突
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [])

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    document.documentElement.classList.toggle("light", next === "light")
    localStorage.setItem("theme", next)
  }

  function toggleNsfw() {
    const next = !nsfw
    setNsfw(next)
    localStorage.setItem("nsfw_status", next ? "1" : "0")
    setCookie("nsfw_status", next ? "1" : "0")
    router.refresh()
  }

  function handleCheckin() {
    if (checkedIn) return
    fetch("/api/checkin", { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (data.ok || data.alreadyDone) {
          setCheckedIn(true)
        }
      })
      .catch(() => {})
    setUserOpen(false)
  }

  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300",
        theme === "dark" 
          ? "border-white/[0.05] bg-zinc-950/85 backdrop-blur-xl" 
          : "border-black/[0.05] bg-white/85 backdrop-blur-xl"
      )}
        style={{
          boxShadow: theme === "dark"
            ? '0 1px 2px rgba(0,0,0,0.15)'
            : '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {/* 顶部高光边 */}
        <div className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          theme === "dark" ? "via-white/[0.06]" : "via-black/[0.04]"
        )} />
        
        {/* 论坛按钮 - 固定在左侧留白区域（容器外）*/}
          <button
          onClick={() => {
            // 手机端：直接跳转到求档中心页面
            if (window.innerWidth < 1024) {
              window.location.href = '/forum'
            } else {
              // 桌面端：展开侧边栏
              setForumOpen(v => !v)
            }
          }}
          className={cn(
            "fixed top-0 left-4 z-[60] flex h-14 w-14 items-center justify-center border-b border-r transition-all btn-spring lg:left-4 lg:h-16 lg:w-16",
            theme === "dark"
              ? "border-white/[0.05] bg-zinc-950/85 text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300"
              : "border-black/[0.05] bg-white/85 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
          )}
          style={{
            backdropFilter: 'blur(24px)',
          }}
        >
          <MessageSquare className="h-[22px] w-[22px] lg:h-[26px] lg:w-[26px]" strokeWidth={2.2} />
        </button>

        {/* 主容器 */}
        <div className="mx-auto flex h-14 max-w-[1300px] items-center gap-3 pl-[76px] pr-4 lg:ml-[max(calc((100vw-1200px)/2),0px)] lg:px-4">

          {/* 三条杠菜单 - 第一个位置 */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-all btn-spring lg:h-12 lg:w-12",
                theme === "dark" 
                  ? "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
                  : "text-zinc-500 hover:bg-black/[0.04] hover:text-zinc-800"
              )}
            >
              <Menu className="h-[22px] w-[22px] lg:h-[26px] lg:w-[26px]" strokeWidth={2.2} />
            </button>
            {menuOpen && (
              <div className={cn(
                "absolute left-0 top-full mt-2 w-48 overflow-hidden rounded-xl",
                theme === "dark"
                  ? "border border-white/[0.06] bg-zinc-900/95 backdrop-blur-xl"
                  : "border border-black/[0.06] bg-white/95 backdrop-blur-xl"
              )}
                style={{
                  boxShadow: theme === "dark"
                    ? '0 4px 16px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)'
                    : '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                {MENU_ITEMS.map(({ icon: Icon, label, href }) => (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                      theme === "dark"
                        ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    )}>
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 首页 */}
          <Link href="/" className={cn(
            "ml-1 text-base font-semibold transition-colors",
            theme === "dark" ? "text-zinc-300 hover:text-white" : "text-zinc-700 hover:text-zinc-950"
          )}>
            首页
          </Link>

          {/* 右侧 */}
          <div className="ml-auto flex items-center gap-2">
            <Link href="/search" className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-all lg:h-12 lg:w-12",
              theme === "dark" 
                ? "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
                : "text-zinc-500 hover:bg-black/[0.04] hover:text-zinc-800"
            )}>
              <Search className="h-[22px] w-[22px] lg:h-[26px] lg:w-[26px]" strokeWidth={2.2} />
            </Link>

            <button onClick={toggleTheme} className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-all lg:h-12 lg:w-12",
              theme === "dark" 
                ? "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
                : "text-zinc-500 hover:bg-black/[0.04] hover:text-zinc-800"
            )}>
              {theme === "light" ? <Sun className="h-[22px] w-[22px] lg:h-[26px] lg:w-[26px]" strokeWidth={2.2} /> : <Moon className="h-[22px] w-[22px] lg:h-[26px] lg:w-[26px]" strokeWidth={2.2} />}
            </button>

            {user ? (
              <div ref={userRef} className="relative ml-1">
                <button
                  onClick={() => setUserOpen(v => !v)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 transition-all lg:h-11 lg:w-11",
                    theme === "dark" 
                      ? "ring-white/10 hover:ring-white/25"
                      : "ring-black/10 hover:ring-black/25"
                  )}
                >
                  {user.image
                    ? <img src={user.image} alt={user.name ?? ""} className="h-full w-full object-cover" />
                    : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-blue-500 text-xs font-bold text-white">{(user.name ?? "U")[0].toUpperCase()}</div>
                  }
                </button>

                {userOpen && (
                  <div className={cn(
                    "absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl",
                    theme === "dark"
                      ? "border border-white/[0.06] bg-zinc-900/95 backdrop-blur-xl"
                      : "border border-black/[0.06] bg-white/95 backdrop-blur-xl"
                  )}
                    style={{
                      boxShadow: theme === "dark"
                        ? '0 4px 16px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)'
                        : '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      theme === "dark" ? "border-b border-white/[0.06]" : "border-b border-black/[0.06]"
                    )}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-500 text-xs font-bold text-white">
                        {user.image
                          ? <img src={user.image} alt="" className="h-full w-full object-cover" />
                          : (user.name ?? "U")[0].toUpperCase()}
                      </div>
                      <span className={cn(
                        "truncate text-sm font-semibold",
                        theme === "dark" ? "text-zinc-100" : "text-zinc-900"
                      )}>{user.name}</span>
                    </div>

                    <Link href={`/profile/${user.id}`} onClick={() => setUserOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        theme === "dark"
                          ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      )}>
                      <User className="h-5 w-5 shrink-0" strokeWidth={2} />
                      用户主页
                    </Link>

                    <button onClick={handleCheckin} disabled={checkedIn}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        checkedIn 
                          ? "cursor-default text-zinc-600" 
                          : (theme === "dark" ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900")
                      )}>
                      <CalendarCheck className="h-5 w-5 shrink-0" strokeWidth={2} />
                      {checkedIn ? "今日已签到 ✓" : "每日签到"}
                    </button>

                    <button onClick={toggleNsfw}
                      className={cn(
                        "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors",
                        theme === "dark"
                          ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      )}>
                      <span className="flex items-center gap-3">
                        <ShieldAlert className="h-5 w-5 shrink-0" strokeWidth={2} />
                        NSFW 内容
                      </span>
                      <div className={cn("relative h-5 w-9 rounded-full transition-colors", nsfw ? "bg-red-500/60" : (theme === "dark" ? "bg-zinc-700" : "bg-zinc-300"))}>
                        <div className={cn("absolute top-0.5 h-4 w-4 rounded-full shadow transition-transform", nsfw ? "translate-x-4 bg-white" : (theme === "dark" ? "translate-x-0.5 bg-white" : "translate-x-0.5 bg-zinc-600"))} />
                      </div>
                    </button>

                    <div className={cn(
                      "border-t",
                      theme === "dark" ? "border-white/[0.06]" : "border-black/[0.06]"
                    )} />

                    <button onClick={() => { setUserOpen(false); signOut({ callbackUrl: "/" }) }}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        theme === "dark"
                          ? "text-red-400 hover:bg-zinc-800"
                          : "text-red-600 hover:bg-zinc-100"
                      )}>
                      <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="ml-1 flex items-center gap-2">
              <Link href="/login" className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-all",
                  theme === "dark"
                    ? "text-zinc-500 hover:text-zinc-300"
                    : "text-zinc-600 hover:text-zinc-900"
                )}>
                  登录
                </Link>
                <Link href="/register" className="gradient-accent rounded-full px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-85">
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 论坛侧边栏遮罩 - 仅移动端显示 */}
      {forumOpen && (
        <div 
          className={cn(
            "fixed inset-0 z-40 backdrop-blur-sm fade-in lg:hidden",
            theme === "dark" ? "bg-black/40" : "bg-white/40"
          )} 
          onClick={() => setForumOpen(false)} 
        />
      )}

      {/* 论坛侧边栏 - 响应式设计 */}
      <aside className={cn(
        "fixed top-14 z-40 flex h-[calc(100vh-3.5rem)] flex-col backdrop-blur-2xl transition-all duration-300 ease-out",
        // 桌面端：左边缘对齐容器左边缘(px-4=16px)，右边缘对齐三条杠按钮左边缘(16+36=52px)
        // 所以侧边栏宽度应该是 280px，左边缘在 16px，右边缘在 16+280=296px
        // 但我们要右边缘在 52px，所以左边缘应该在 52-280=-228px（不合理）
        // 重新理解：论坛卡片展开后最右侧对齐三条杠最左侧
        // 三条杠最左侧位置：容器左边距16px，所以右边缘应该在16px处
        // 侧边栏宽度280px，那么左边缘应该在 16-280=-264px（也不合理）
        // 正确理解：应该是侧边栏从左边开始，右边缘对齐三条杠左边缘
        // 三条杠在容器内，距离屏幕左边 = 容器左边距(屏幕宽度/2 - 600 + 16)
        // 简化处理：侧边栏从屏幕左边开始，宽度设为让右边缘刚好在三条杠左侧
        "lg:left-0 lg:translate-x-0",
        forumOpen ? "lg:w-[240px]" : "lg:w-0 lg:border-r-0 lg:overflow-hidden",
        // 移动端：保持原有全屏覆盖模式
        "left-0 w-full",
        forumOpen ? "translate-x-0 sidebar-enter" : "-translate-x-full sidebar-exit",
        // 高级质感样式 - 根据主题动态变化
        theme === "dark"
          ? "bg-gradient-to-b from-zinc-950 via-zinc-950/98 to-zinc-900/95 border-r border-white/[0.08]"
          : "bg-gradient-to-b from-white via-white/98 to-zinc-50/95 border-r border-black/[0.08]",
      )}
        style={{
          boxShadow: forumOpen 
            ? (theme === "dark" ? '4px 0 24px rgba(0,0,0,0.4), 8px 0 48px rgba(0,0,0,0.2)' : '4px 0 24px rgba(0,0,0,0.1), 8px 0 48px rgba(0,0,0,0.05)')
            : 'none',
        }}
      >
        {/* 左侧高光边 */}
        {forumOpen && (
          <div className={cn(
            "absolute inset-y-0 left-0 w-px bg-gradient-to-b via-transparent",
            theme === "dark" ? "from-white/10 to-black/20" : "from-black/5 to-white/20"
          )} />
        )}
        <div className={cn(
          "flex items-center justify-between border-b px-5 py-4",
          theme === "dark" 
            ? "border-white/[0.08] bg-zinc-900/50"
            : "border-black/[0.08] bg-zinc-100/50"
        )}>
          <span className={cn(
            "text-sm font-semibold",
            theme === "dark" ? "text-zinc-200" : "text-zinc-900"
          )}>论坛动态</span>
          <button onClick={() => setForumOpen(false)} className={cn(
            "transition-all hover:rotate-90",
            theme === "dark" ? "text-zinc-500 hover:text-zinc-300" : "text-zinc-500 hover:text-zinc-800"
          )}>
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <ForumSidebarPosts theme={theme} />
        </div>
        <div className={cn(
          "border-t p-4",
          theme === "dark" 
            ? "border-white/[0.08] bg-zinc-900/50"
            : "border-black/[0.08] bg-zinc-100/50"
        )}>
          <Link href="/forum" onClick={() => setForumOpen(false)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all",
              theme === "dark"
                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 hover:text-zinc-900"
            )}>
            <MessageSquare className="h-5 w-5" strokeWidth={2} />
            进入求档区
          </Link>
        </div>
      </aside>
    </>
  )
}

function ForumSidebarPosts({ theme }: { theme: "dark" | "light" }) {
  const [posts, setPosts] = useState<{ id: string; title: string; user: { username: string } }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/forum/posts")
      .then(r => r.json())
      .then(data => { setPosts(data.slice(0, 20)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className={cn("p-4 text-xs", theme === "dark" ? "text-zinc-600" : "text-zinc-600")}>加载中…</p>
  if (!posts.length) return <p className={cn("p-4 text-xs", theme === "dark" ? "text-zinc-600" : "text-zinc-600")}>暂无帖子，来发第一帖吧~</p>

  return (
    <div className="space-y-0.5">
      {posts.map(p => (
        <Link key={p.id} href="/forum"
          className={cn(
            "block w-full rounded-lg px-3 py-2.5 text-left transition-colors",
            theme === "dark" ? "hover:bg-zinc-800/60" : "hover:bg-zinc-200/60"
          )}>
          <p className={cn("mb-0.5 text-[10px]", theme === "dark" ? "text-zinc-600" : "text-zinc-600")}>{p.user.username}</p>
          <p className={cn("line-clamp-2 text-xs font-medium", theme === "dark" ? "text-zinc-400" : "text-zinc-700")}>{p.title}</p>
        </Link>
      ))}
    </div>
  )
}
