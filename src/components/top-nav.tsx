"use client"

import { AvatarFrame } from "@/components/avatar-frame"
import { CheckInToast } from "@/components/checkin-toast"
import { NotificationBell } from "@/components/notification-bell"
import { useEmotionalMessage } from "@/hooks/use-emotional-messages"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
  CalendarCheck,
  LogOut,
  Menu,
  MessageSquare,
  SunMoon,
  Moon,
  Search,
  ShieldAlert,
  Sun,
  User,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

function getCookie(name: string) {
  if (typeof document === "undefined") return null
  return document.cookie.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="))?.split("=")[1] ?? null
}
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=31536000`
}

interface TopNavProps {
  navCollapsed?: boolean
  onToggleNav?: () => void
  onToggleForum?: () => void
}

export function TopNav({ onToggleNav, onToggleForum }: TopNavProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user

  const [userOpen, setUserOpen]   = useState(false)
  const [scrolled, setScrolled]   = useState(false)
  const [theme, setTheme]         = useState<"dark" | "light" | "system">("dark")
  const [nsfw, setNsfw]           = useState(false)
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
  const { message: checkinMsg } = useEmotionalMessage("checkin_success")
  const { message: checkinDupMsg } = useEmotionalMessage("checkin_duplicate")

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

    const nsfwVal = getCookie("nsfw_status") === "1"
    setNsfw(nsfwVal)

    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/checkin", { signal: controller.signal })
      .then(r => r.json())
      .then(data => setCheckedIn(data.data?.checkedIn ?? false))
      .catch(() => setCheckedIn(false))
    return () => controller.abort()
  }, [])

  // 获取用户总印记数
  useEffect(() => {
    if (!user?.id) return
    fetch("/api/user/stats")
      .then(r => r.json())
      .then(data => {
        if (data.data?.totalMarks !== undefined) {
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
        try { localStorage.setItem("local_avatar", detail.image) } catch {}
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
      try { localStorage.removeItem("local_avatar") } catch {}
    }
  }, [user?.image, localAvatar])

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
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

  function toggleNsfw() {
    const next = !nsfw
    setNsfw(next)
    localStorage.setItem("nsfw_status", next ? "1" : "0")
    setCookie("nsfw_status", next ? "1" : "0")
    router.refresh()
  }

  function handleCheckin() {
    if (checkedIn || checkinLoading) return
    setCheckinLoading(true)
    setUserOpen(false)
    fetch("/api/checkin", { method: "POST" })
      .then(r => r.json())
      .then(data => {
        console.log('[签到] API 返回:', data)
        // 成功响应
        if (data.success && data.data) {
          const d = data.data as { ok?: boolean; alreadyDone?: boolean; marks?: number; total?: number }
          console.log('[签到] data:', d, 'marks:', d.marks)
          if (d.ok) {
            setCheckedIn(true)
            console.log('[签到] 设置 toastMarks =', d.marks)
            setToastMarks(d.marks ?? 0)
            return
          }
        }
        // 409 conflict: alreadyDone 在 data.data 里
        if (data.data?.alreadyDone) {
          setCheckedIn(true)
          return
        }
        // 其他情况视为失败
        const errorMsg = data.error || "签到失败，请稍后重试"
        toast.error(errorMsg)
      })
      .catch((e) => {
        console.error('[签到] 错误:', e)
        toast.error("签到失败，请稍后重试")
      })
      .finally(() => { setCheckinLoading(false) })
  }

  return (
    <>
      <header
        className="flex h-14 items-center rounded-xl border backdrop-blur-2xl transition-all duration-200"
        style={{
          background: "color-mix(in srgb, var(--surface-float) 70%, transparent)",
          borderColor: scrolled ? "var(--surface-float-border)" : "var(--border)",
          boxShadow: scrolled
            ? "var(--shadow-lg)"
            : "var(--shadow-md)",
        }}
      >
        <div className="flex h-full w-full items-center gap-1 sm:gap-3">

          <button
            onClick={onToggleNav}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring nav-icon-btn hover:bg-muted"
            aria-label="切换侧边栏"
          >
            <Menu className="h-[22px] w-[22px] lg:h-[24px] lg:w-[24px]" strokeWidth={2.5} />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/search" className="flex h-11 w-11 items-center justify-center rounded-full transition-all lg:h-11 lg:w-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring nav-icon-btn hover:bg-muted">
              <Search className="h-[22px] w-[22px] lg:h-[24px] lg:w-[24px]" strokeWidth={2.5} />
            </Link>

            {user && <NotificationBell />}

            <button
              onClick={onToggleForum}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring nav-icon-btn hover:bg-muted"
              title="论坛"
            >
              <MessageSquare className="h-[22px] w-[22px] lg:h-[24px] lg:w-[24px]" strokeWidth={2.5} />
            </button>

            <button onClick={toggleTheme} title={theme === "dark" ? "深色模式" : theme === "light" ? "浅色模式" : "跟随系统"} className="flex h-11 w-11 items-center justify-center rounded-full transition-all lg:h-11 lg:w-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring nav-icon-btn hover:bg-muted">
              {theme === "light" ? <Sun className="h-[22px] w-[22px] lg:h-[24px] lg:w-[24px]" strokeWidth={2.5} />
                : theme === "dark" ? <Moon className="h-[22px] w-[22px] lg:h-[24px] lg:w-[24px]" strokeWidth={2.5} />
                : <SunMoon className="h-[22px] w-[22px] lg:h-[24px] lg:w-[24px]" strokeWidth={2.5} />}
            </button>

            {user ? (
              <div ref={userRef} className="relative ml-1">
                <button
                  onClick={() => setUserOpen(v => !v)}
                  className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full ring-2 ring-border transition-all hover:ring-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {(session?.user as Record<string, unknown> & { composedAvatarUrl?: string })?.composedAvatarUrl
                      ? <Image src={`${(session?.user as Record<string, unknown> & { composedAvatarUrl?: string })?.composedAvatarUrl as string}${((session?.user as Record<string, unknown> & { composedAvatarUrl?: string })?.composedAvatarUrl as string).includes('?') ? '&' : '?'}t=${avatarVersion}`} alt={user.name ?? ""} width={40} height={40} className="h-full w-full object-cover rounded-full" unoptimized onError={(e) => { e.currentTarget.style.display = 'none'; const fb = document.createElement('div'); fb.className = 'flex h-full w-full items-center justify-center rounded-full bg-primary/80 text-xs font-bold text-white'; fb.textContent = (user.name ?? "U")[0].toUpperCase(); e.currentTarget.parentElement?.appendChild(fb); }} />
                      : <AvatarFrame frameId={user.avatarFrame || "none"} size={40}>
                          {(localAvatar || user.image)
                            ? <Image src={`${(localAvatar || user.image)}${(localAvatar || user.image || '').includes('?') ? '&' : '?'}t=${avatarVersion}`} alt={user.name ?? ""} width={40} height={40} className="h-full w-full object-cover rounded-full" unoptimized onError={(e) => { e.currentTarget.style.display = 'none'; const fb = document.createElement('div'); fb.className = 'flex h-full w-full items-center justify-center rounded-full bg-primary/80 text-xs font-bold text-white'; fb.textContent = (user.name ?? "U")[0].toUpperCase(); e.currentTarget.parentElement?.appendChild(fb); }} />
                            : <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/80 text-xs font-bold text-white">{(user.name ?? "U")[0].toUpperCase()}</div>
                          }
                        </AvatarFrame>
                    }
                </button>

                {userOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl bg-popover ring-1 ring-border shadow-lg">
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
                      <span className="text-lg font-bold text-amber-500">{totalMarks}</span>
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
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <CalendarCheck className="h-5 w-5 shrink-0" strokeWidth={2} />
                      )}
                      {checkinLoading ? "签到中…" : checkedIn ? "今日已签到 ✓" : "每日签到"}
                    </button>

                    <button onClick={toggleNsfw}
                      className="flex w-full items-center justify-between px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                      <span className="flex items-center gap-3">
                        <ShieldAlert className="h-5 w-5 shrink-0" strokeWidth={2} />
                        NSFW 内容
                      </span>
                      <div className={cn("relative h-6 w-11 rounded-full transition-colors", nsfw ? "bg-red-500/60" : "bg-muted")}>
                        <div className={cn("absolute top-0.5 h-5 w-5 rounded-full shadow transition-transform", nsfw ? "translate-x-5 bg-white" : "translate-x-0.5 bg-muted-foreground")} />
                      </div>
                    </button>

                    <div className="border-t border-border" />

                    <button onClick={() => {
                      setUserOpen(false)
                      try {
                        localStorage.clear()
                        sessionStorage.clear()
                      } catch {}
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
                <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-full px-6 text-base font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground hover:text-foreground hover:bg-muted">
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

