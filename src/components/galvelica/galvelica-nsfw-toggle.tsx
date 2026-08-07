"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Eye, EyeOff, ChevronDown, Lock } from "lucide-react"

/**
 * 副站 NSFW 过滤开关（三段式弹出菜单）：只显示 SFW / 只显示 NSFW / 两个都显示。
 * - 过滤直接作用于游戏本体（露骨游戏在 SFW 模式下直接不显示，不做封面隐藏）
 * - ⚠️ 切换需要登录（合规考量）：未登录点击菜单 → 跳转登录（callbackUrl 回跳）
 * - cookie `gal_nsfw`：sfw（默认）/ nsfw / all；兼容旧值 "1"→all、"0"→sfw
 * - router.refresh() 触发服务端重渲染（galvelica.ts resolveNsfwMode 按 cookie 过滤）
 */
export function GalvelicaNsfwToggle({ className }: { className?: string }) {
  const router = useRouter()
  const { status } = useSession()
  const [mode, setMode] = useState<"sfw" | "nsfw" | "all">("sfw")
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const v = document.cookie
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("gal_nsfw="))
      ?.split("=")[1]
    setMode(v === "nsfw" ? "nsfw" : v === "all" || v === "1" ? "all" : "sfw")
  }, [])

  // 点击外部关闭菜单
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const MODE_META: Record<string, { label: string; desc: string }> = {
    sfw: { label: "SFW", desc: "只显示安全封面" },
    nsfw: { label: "NSFW", desc: "只显示露骨封面" },
    all: { label: "全部", desc: "SFW 与 NSFW 都显示" },
  }

  function select(next: "sfw" | "nsfw" | "all") {
    setOpen(false)
    if (status !== "authenticated") {
      // 切换过滤需登录
      const cb = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?callbackUrl=${cb}`
      return
    }
    setMode(next)
    document.cookie = `gal_nsfw=${next};path=/;max-age=31536000`
    router.refresh()
  }

  const cur = MODE_META[mode]

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => (status !== "authenticated" ? select(mode) : setOpen((o) => !o))}
        aria-pressed={open}
        aria-label={`NSFW 过滤（当前 ${cur.label}）`}
        title={`NSFW 过滤：${cur.desc}（切换需登录）`}
        className={
          className ??
          "galvelica-navlink inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium whitespace-nowrap"
        }
      >
        {mode === "sfw" ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
        <span className="hidden sm:inline">{cur.label}</span>
        {status === "authenticated" ? (
          <ChevronDown className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />
        ) : (
          <Lock className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />
        )}
      </button>

      {open && status === "authenticated" && (
        <div className="galvelica-card absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden p-1">
          {(["sfw", "nsfw", "all"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => select(k)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                mode === k
                  ? "bg-[var(--gal-accent-soft)] font-semibold text-[var(--gal-accent)]"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <span>
                <span className="font-medium">{MODE_META[k].label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{MODE_META[k].desc}</span>
              </span>
              {mode === k && <span className="text-[var(--gal-accent)]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
