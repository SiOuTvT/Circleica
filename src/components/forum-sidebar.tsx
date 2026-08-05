"use client"

import { cn } from "@/lib/utils"
import { MessageSquare, X } from "lucide-react"
import Link from "next/link"
import { Tag } from "@/components/ui/tag"
import { useEffect, useState } from "react"
import { apiFetchSafe } from "@/lib/api-client"
import { FORUM_CATEGORIES } from "@/lib/forum-categories"

interface ForumSidebarProps {
  open: boolean
  expanded?: boolean
  onToggle: () => void
}

export function ForumSidebar({ open, expanded = false, onToggle }: ForumSidebarProps) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)")
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  return (
    <>
      {/* 移动端遮罩 */}
      {open && (
        <div
          className="fixed inset-0 z-[32] backdrop-blur-sm fade-in lg:hidden bg-black/40 touch-none cursor-pointer"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "fixed z-50 flex flex-col transition-transform duration-300 ease-out lg:transition-[width,transform]",
          "top-[env(safe-area-inset-top,0px)] h-[calc(100dvh-env(safe-area-inset-top,0px))]",
          "right-0",
        )}
        style={{
          background: "var(--sidebar)",
          borderLeft: "1px solid var(--sidebar-border)",
          width: isMobile ? "min(82vw, 300px)" : expanded ? 340 : 260,
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {open && (
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-border via-transparent to-transparent" />
        )}

        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3 lg:px-5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
            <span className="text-sm font-semibold text-foreground">论坛动态</span>
          </div>
          <button
            onClick={onToggle}
            aria-label="关闭论坛侧栏"
            className="text-muted-foreground transition-all hover:rotate-90 hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* 主操作：进入求档区 */}
        <div className="border-b border-border p-3 lg:px-4 lg:py-3">
          <Link
            href="/forum"
            onClick={onToggle}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={2} aria-hidden />
            进入求档区
          </Link>
        </div>

        {/* 分类快捷导航 */}
        <div className="border-b border-border px-3 py-3 lg:px-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/70">分类</p>
          <div className="flex flex-wrap gap-1.5">
            {FORUM_CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/forum?category=${cat.value}`}
                onClick={onToggle}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border/60 transition-colors hover:bg-accent hover:text-foreground"
              >
                <cat.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* 最新动态 */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center px-3 pt-3 lg:px-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/70">最新</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 lg:px-3 lg:py-2">
            {open && <ForumSidebarPosts />}
          </div>
        </div>
      </aside>
    </>
  )
}

function ForumSidebarPosts() {
  const [posts, setPosts] = useState<{ id: string; title: string; user: { username: string }; isSolved?: boolean; createdAt?: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    apiFetchSafe<{ posts?: any[] }>("/api/forum/posts", { signal: controller.signal })
      .then(({ ok, data }) => { if (ok) setPosts(((data?.posts as any[]) || []).slice(0, 20)); setLoading(false) })
      .catch(() => setLoading(false))
    return () => controller.abort()
  }, [])

  if (loading) return <p className="px-2 py-4 text-xs text-muted-foreground">加载中…</p>
  if (!posts.length) return <p className="px-2 py-4 text-xs text-muted-foreground">暂无帖子</p>

  return (
    <ul className="space-y-0.5">
      {posts.map((p) => (
        <li key={p.id}>
          <Link
            href={`/forum/${p.id}`}
            className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/60"
          >
            <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{p.title}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="truncate text-xs text-muted-foreground">{p.user.username}</span>
              {p.isSolved !== undefined && (
                <Tag variant="badge" color={p.isSolved ? "var(--success)" : "var(--warning)"}>
                  {p.isSolved ? "已解决" : "未解决"}
                </Tag>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
