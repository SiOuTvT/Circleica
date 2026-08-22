"use client"

import { AvatarFrame } from "@/components/avatar-frame"
import { CheckInToast } from "@/components/checkin-toast"
import { MessageBell } from "@/components/message-bell"
import { NotificationBell } from "@/components/notification-bell"
import { NsfwModeToggle } from "@/components/nsfw-mode-toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useEmotionalMessages } from "@/hooks/use-emotional-messages"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import { api, apiFetchSafe, ApiError } from "@/lib/api-client"
import { toShanghaiDate } from "@/lib/date"
import Image from "next/image"
import { type LogoMode } from "@/lib/branding"
import {
  CalendarCheck,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  SunMoon,
  Moon,
  Search,
  Sun,
  User,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

// 签到情感消息 key 常量
const CHECKIN_MSG_KEYS: string[] = ["checkin_success", "checkin_duplicate"]

interface TopNavProps {
  navCollapsed?: boolean
  onToggleNav?: () => void
  onToggleForum?: () => void
  logoMode?: LogoMode
  siteLogo?: string | null
}

export function TopNav({ onToggleNav, onToggleForum }: TopNavProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user

  const [userOpen, setUserOpen]   = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const [theme, setTheme]         = useState<"dark" | "light" | "system">("dark")
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [toastMarks, setToastMarks] = useState<number | null>(null)
  const [totalMarks, setTotalMarks] = useState<number>(0)
  // 用于强制头像重新渲染的版本号
  const [avatarVersion, setAvatarVersion] = useState(0)
  // 本地覆盖的头像 URL（避免将 base64 存入 JWT cookie），从 localStorage 恢复
  const [localAvatar, setLocalAvatar] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    try { return localStorage.getItem("local_avatar") } catch { return null }
  })
  useEmotionalMessages(CHECKIN_MSG_KEYS)

  const userRef = useRef<HTMLDivElement>(null)

  // 在客户端挂载后从 localStorage/cookie 读取实际值，避免 hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | "system" | null
    const mode = saved || "system"
    setTheme(mode)

    // 应用主题
    const applyTheme = (m: string) => {
      let isLight = false
      if (m === "light") isLight = true
      else if (m === "dark") isLight = false
      else isLight = window.matchMedia("(prefers-color-scheme: light)").matches
      document.documentElement.classList.toggle("light", isLight)
      document.documentElement.classList.toggle("dark", !isLight)
    }
    applyTheme(mode)

    // 系统模式下监听 OS 主题变化
    const mq = window.matchMedia("(prefers-color-scheme: light)")
    const handler = () => {
      if (localStorage.getItem("theme") === "system" || !localStorage.getItem("theme")) {
        applyTheme("system")
      }
    }
    mq.addEventListener("change", handler)

    return () => mq.removeEventListener("change", handler)
  }, [])

  // 签到状态：先从 sessionStorage 读取当日缓存，过期才请求
  // 仅登录用户有签到入口，游客直接跳过，避免全站每页多一次无意义的 401 请求
  useEffect(() => {
    if (!user?.id) return
    const today = toShanghaiDate(new Date())
    try {
      const cached = sessionStorage.getItem("checkin_status")
      if (cached) {
        const { date, checkedIn: val } = JSON.parse(cached)
        if (date === today) { setCheckedIn(val); return }
      }
    } catch (err) { logger.user.warn("[TopNav] read checkin cache failed", { error: err instanceof Error ? err.message : String(err) }) }

    const controller = new AbortController()
    apiFetchSafe<{ data?: { checkedIn?: boolean } }>("/api/checkin", { signal: controller.signal })
      .then(({ ok, data }) => {
        if (!ok) return
        const val = data?.data?.checkedIn ?? false
        setCheckedIn(val)
        try { sessionStorage.setItem("checkin_status", JSON.stringify({ date: today, checkedIn: val })) } catch (err) { logger.user.warn("[TopNav] write checkin cache failed", { error: err instanceof Error ? err.message : String(err) }) }
      })
      .catch(() => setCheckedIn(false))
    return () => controller.abort()
  }, [user?.id])

  // 获取用户总印记数
  useEffect(() => {
    if (!user?.id) return
    apiFetchSafe<{ data?: { totalMarks?: number } }>("/api/user/stats")
      .then(({ ok, data }) => {
        if (ok && data?.data?.totalMarks !== undefined) {
          setTotalMarks(data.data.totalMarks)
        }
      })
      .catch(() => {})
  }, [user?.id])

  // 监听滚动，用于导航栏背景透明度渐变
  useEffect(() => {
    let ticking = false
    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = Math.max(0, window.scrollY)
          setScrolled(y > 10)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // 监听头像更新事件
  useEffect(() => {
    function handleProfileUpdated(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.image) {
        setLocalAvatar(detail.image)
        try { localStorage.setItem("local_avatar", detail.image) } catch (err) { logger.user.warn("[TopNav] write local avatar failed", { error: err instanceof Error ? err.message : String(err) }) }
      }
      setAvatarVersion(v => v + 1)
    }
    window.addEventListener("profile-updated", handleProfileUpdated)
    return () => window.removeEventListener("profile-updated", handleProfileUpdated)
  }, [])

  // 当 session 中的头像 URL 与 localStorage 中的本地覆盖一致时，清除本地覆盖（说明已同步到 session）
  useEffect(() => {
    if (localAvatar && user?.image && localAvatar === user.image) {
       
      setLocalAvatar(null)
      try { localStorage.removeItem("local_avatar") } catch (err) { logger.user.warn("[TopNav] remove local avatar failed", { error: err instanceof Error ? err.message : String(err) }) }
    }
  }, [user?.image, localAvatar])

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  function toggleTheme() {
    const next: "dark" | "light" | "system" = theme === "dark" ? "light" : theme === "light" ? "system" : "dark"
    setTheme(next)
    localStorage.setItem("theme", next)

    let isLight = false
    if (next === "light") isLight = true
    else if (next === "dark") isLight = false
    else isLight = window.matchMedia("(prefers-color-scheme: light)").matches

    document.documentElement.classList.toggle("light", isLight)
    document.documentElement.classList.toggle("dark", !isLight)
  }

  function handleCheckin() {
    if (checkedIn || checkinLoading) return
    setCheckinLoading(true)
    setUserOpen(false)
    api.post<{ data?: { marks?: number } }>("/api/checkin")
      .then((data) => {
        // 成功：{ success: true, data: { marks, streak } }
        setCheckedIn(true)
        setToastMarks(data.data?.marks ?? 0)
        setTotalMarks(prev => prev + (data.data?.marks ?? 0))
        try { sessionStorage.setItem("checkin_status", JSON.stringify({ date: toShanghaiDate(new Date()), checkedIn: true })) } catch {}
        // 刷新当前路由的服务端组件（首页「今日签到」等统计缓存已在服务端失效）→ 无需手动硬刷新
        router.refresh()
      })
      .catch((err) => {
        // 409 冲突（已签到）：视为已签到
        if (err instanceof ApiError && err.code === "CONFLICT") {
          setCheckedIn(true)
          return
        }
        // 其他失败
        toast.error(err instanceof Error ? err.message : "签到失败，请稍后重试")
      })
      .finally(() => { setCheckinLoading(false) })
  }

  return (
    <>
      <header
        className={cn(
          "flex h-14 items-center rounded-xl border transition-all duration-300 lg:backdrop-blur-2xl",
          scrolled ? "shadow-3 backdrop-blur-xl" : "shadow-none backdrop-blur-none"
        )}
        style={{
          background: scrolled
            ? "color-mix(in srgb, var(--surface-float) 85%, transparent)"
            : "color-mix(in srgb, var(--surface-float) 60%, transparent)",
          borderColor: scrolled ? "var(--surface-float-border)" : "var(--border)",
        }}
      >
        <div className="flex h-full w-full items-center gap-1 sm:gap-3">

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleNav}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring nav-icon-btn hover:bg-muted"
                aria-label="切换侧边栏"
              >
                <Menu className="h-5 w-5" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">导航菜单</TooltipContent>
          </Tooltip>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/search" aria-label="搜索" className="flex h-11 w-11 items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring nav-icon-btn hover:bg-muted">
                  <Search className="h-5 w-5" strokeWidth={2} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">搜索</TooltipContent>
            </Tooltip>

            {user && <NotificationBell />}
            {user && <MessageBell />}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleForum}
                  className="flex h-11 w-11 items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring nav-icon-btn hover:bg-muted"
                  aria-label="论坛"
                >
                  <MessageSquare className="h-5 w-5" strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">论坛</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={toggleTheme} aria-label={theme === "dark" ? "切换到浅色模式" : theme === "light" ? "切换到跟随系统" : "切换到深色模式"} className="flex h-11 w-11 items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring nav-icon-btn hover:bg-muted">
                  {theme === "light" ? <Sun className="h-5 w-5" strokeWidth={2} />
                    : theme === "dark" ? <Moon className="h-5 w-5" strokeWidth={2} />
                    : <SunMoon className="h-5 w-5" strokeWidth={2} />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{theme === "dark" ? "深色模式" : theme === "light" ? "浅色模式" : "跟随系统"}</TooltipContent>
            </Tooltip>

            {user ? (
              <div ref={userRef} className="relative ml-1">
                <button
                  onClick={() => setUserOpen(v => !v)}
                  aria-label="用户菜单"
                  aria-haspopup="menu"
                  aria-expanded={userOpen}
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-border transition-all hover:ring-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {(session?.user as Record<string, unknown> & { composedAvatarUrl?: string })?.composedAvatarUrl
                      ? <Image src={`${(session?.user as Record<string, unknown> & { composedAvatarUrl?: string })?.composedAvatarUrl as string}${((session?.user as Record<string, unknown> & { composedAvatarUrl?: string })?.composedAvatarUrl as string).includes('?') ? '&' : '?'}t=${avatarVersion}`} alt={user.name ?? ""} width={36} height={36} className="h-full w-full object-cover rounded-full" unoptimized onError={(e) => { e.currentTarget.style.display = 'none'; const fb = document.createElement('div'); fb.className = 'flex h-full w-full items-center justify-center rounded-full bg-primary/80 text-[10px] font-bold text-white'; fb.textContent = (user.name ?? "U")[0].toUpperCase(); e.currentTarget.parentElement?.appendChild(fb); }} />
                      : <AvatarFrame frameId={user.avatarFrame || "none"} size={36}>
                          {(localAvatar || user.image)
                            ? <Image src={`${(localAvatar || user.image)}${(localAvatar || user.image || '').includes('?') ? '&' : '?'}t=${avatarVersion}`} alt={user.name ?? ""} width={36} height={36} className="h-full w-full object-cover rounded-full" unoptimized onError={(e) => { e.currentTarget.style.display = 'none'; const fb = document.createElement('div'); fb.className = 'flex h-full w-full items-center justify-center rounded-full bg-primary/80 text-[10px] font-bold text-white'; fb.textContent = (user.name ?? "U")[0].toUpperCase(); e.currentTarget.parentElement?.appendChild(fb); }} />
                            : <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/80 text-xs font-bold text-white">{(user.name ?? "U")[0].toUpperCase()}</div>
                          }
                        </AvatarFrame>
                    }
                </button>

                {userOpen && (
                  // overflow-visible：允许「NSFW 过滤」的三段展台向左溢出菜单卡片展开
                  <div className="absolute right-0 top-full mt-2 w-52 overflow-visible rounded-xl bg-popover ring-1 ring-border shadow-3">
                    {/* 用户信息区 */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/80 text-xs font-bold text-white ring-1 ring-border">
                        {(localAvatar || user.image)
                          ? <Image src={`${(localAvatar || user.image)}${(localAvatar || user.image || '').includes('?') ? '&' : '?'}t=${avatarVersion}`} alt="" width={36} height={36} className="h-full w-full object-cover" unoptimized onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.insertAdjacentText('beforeend', (user.name ?? "U")[0].toUpperCase()); }} />
                          : (user.name ?? "U")[0].toUpperCase()}
                      </div>
                      <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
                    </div>

                    {/* 印记信息区 */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                      <span className="text-sm text-muted-foreground">印记</span>
                      <span className="text-lg font-bold text-warning">{totalMarks}</span>
                    </div>

                    {/* 功能菜单 */}
                    <Link href={`/user/${user.serialId || user.id}`} onClick={() => setUserOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                      <User className="h-5 w-5 shrink-0" strokeWidth={2} />
                      用户主页
                    </Link>

                    <button onClick={handleCheckin} disabled={checkedIn || checkinLoading}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        checkedIn
                          ? "cursor-default text-muted-foreground/50"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}>
                      {checkinLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarCheck className="h-5 w-5 shrink-0" strokeWidth={2} />
                      )}
                      {checkinLoading ? "签到中…" : checkedIn ? "今日已签到 ✓" : "每日签到"}
                    </button>

                    {/* NSFW 三段式过滤（SFW / NSFW / 全部，切换需登录；展台向左展开） */}
                    <div className="border-t border-border" />
                    <NsfwModeToggle />

                    <div className="border-t border-border" />

                    <button onClick={() => {
                      setUserOpen(false)
                      try {
                        // 仅清理与登录用户会话相关的本地缓存，保留主题 / NSFW 等偏好（L3）
                        localStorage.removeItem("local_avatar")
                        sessionStorage.removeItem("checkin_status")
                      } catch (err) { logger.user.warn("[TopNav] clear storage failed", { error: err instanceof Error ? err.message : String(err) }) }
                      signOut({ callbackUrl: "/" })
                    }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-accent">
                      <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="ml-1">
                <Link href="/login" className="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:text-foreground hover:bg-muted">
                  登录
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {toastMarks !== null && (
        <CheckInToast
          marks={toastMarks}
          onClose={() => setToastMarks(null)}
        />
      )}
    </>
  )
}

