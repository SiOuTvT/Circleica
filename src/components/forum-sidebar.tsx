"use client"

import { cn } from "@/lib/utils"
import { MessageSquare, X } from "lucide-react"
import Link from "next/link"
import { Tag } from "@/components/ui/tag"
import { useEffect, useState } from "react"

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
          width: isMobile ? "min(55vw, 220px)" : expanded ? 340 : 260,
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {open && (
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-border via-transparent to-transparent" />
        )}
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5 lg:px-5 lg:py-4 bg-muted/50">
          <span className="text-sm font-semibold text-foreground">论坛动态</span>
          <button onClick={onToggle} className="text-muted-foreground transition-all hover:rotate-90 hover:text-foreground">
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="border-b border-border p-2 lg:p-3 bg-muted/50">
          <Link href="/forum" onClick={onToggle}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 lg:py-2.5 text-sm font-medium transition-all bg-secondary text-secondary-foreground hover:bg-accent hover:text-foreground">
            <MessageSquare className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2} />
            进入求档区
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-2 lg:p-3">
          {open && <ForumSidebarPosts />}
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
    fetch("/api/forum/posts", { signal: controller.signal })
      .then(r => r.json())
      .then(data => { setPosts((data.posts || []).slice(0, 20)); setLoading(false) })
      .catch(() => setLoading(false))
    return () => controller.abort()
  }, [])

  if (loading) return <p className="p-4 text-xs text-muted-foreground">加载中…</p>
  if (!posts.length) return <p className="p-4 text-xs text-muted-foreground">暂无帖子</p>

  return (
    <div className="space-y-2">
      {posts.map(p => (
        <Link key={p.id} href={`/forum/${p.id}`}
          className="flex flex-col gap-1 rounded-xl px-3 py-2.5 transition-all hover:bg-accent/50">
          <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">{p.title}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{p.user.username}</span>
            {p.isSolved !== undefined && (
              <Tag variant="badge" color={p.isSolved ? "#10b981" : "#f59e0b"}>
                {p.isSolved ? "已解决" : "未解决"}
              </Tag>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
