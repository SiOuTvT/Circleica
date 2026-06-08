"use client"

import { cn } from "@/lib/utils"
import { MessageSquare, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface ForumSidebarProps {
  open: boolean
  expanded?: boolean
  onToggle: () => void
}

export function ForumSidebar({ open, expanded = false, onToggle }: ForumSidebarProps) {
  return (
    <>
      {/* 移动端遮罩 */}
      {open && (
        <div
          className="fixed inset-0 z-35 backdrop-blur-sm fade-in lg:hidden bg-black/40 touch-none"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          "fixed z-40 flex flex-col",
          "top-[env(safe-area-inset-top,0px)] h-[calc(100dvh-env(safe-area-inset-top,0px))]",
          "right-0",
        )}
        style={{
          background: "var(--sidebar)",
          borderLeft: "1px solid var(--sidebar-border)",
          width: expanded ? 360 : 280,
          transform: open ? "translateX(0)" : "translateX(100%)",
          opacity: open ? 1 : 0,
          transition: "transform 0.3s ease, opacity 0.3s ease, width 0.3s ease",
          boxShadow: "none",
        }}
      >
        {open && (
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-border via-transparent to-transparent" />
        )}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/50">
          <span className="text-sm font-semibold text-foreground">论坛动态</span>
          <button onClick={onToggle} className="text-muted-foreground transition-all hover:rotate-90 hover:text-foreground">
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="border-b border-border p-3 bg-muted/50">
          <Link href="/forum" onClick={onToggle}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all bg-secondary text-secondary-foreground hover:bg-accent hover:text-foreground">
            <MessageSquare className="h-5 w-5" strokeWidth={2} />
            进入求档区
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <ForumSidebarPosts />
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
      .then(data => { setPosts(data.slice(0, 20)); setLoading(false) })
      .catch(() => setLoading(false))
    return () => controller.abort()
  }, [])

  if (loading) return <p className="p-4 text-xs text-muted-foreground">加载中…</p>
  if (!posts.length) return <p className="p-4 text-xs text-muted-foreground">暂无帖子</p>

  return (
    <div className="space-y-1.5">
      {posts.map(p => (
        <Link key={p.id} href={`/forum?post=${p.id}`}
          className="block rounded-lg p-2.5 transition-all hover:border-primary/20"
          style={{ background: "#141416", border: "1px solid rgba(255,255,255,0.04)" }}>
          <p className="line-clamp-2 text-xs font-medium text-foreground leading-relaxed">{p.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {p.isSolved !== undefined && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${p.isSolved ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/10 text-primary"}`}>
                {p.isSolved ? "已解决" : "未解决"}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">{p.user.username}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
