"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { timeAgo } from "@/lib/time-ago"

// ─── Types ────────────────────────────────────────────────────

interface AnnounceItem {
  id: string
  title: string
  summary: string
  content: string
  imageUrl: string
  link: string
  createdAt: string
  authorName: string
  authorAvatar: string
  isPinned: boolean
}

export interface ActivityItem {
  id: string
  type: string
  title: string
  time: string
  avatar?: string
  username?: string
}

// ─── Data ─────────────────────────────────────────────────────

export function buildActivities(announcements: AnnounceItem[]): ActivityItem[] {
  const items: ActivityItem[] = []
  if (announcements.length > 0) {
    const a = announcements[0]
    items.push({ id: `ann-${a.id}`, type: "announcement", title: a.title, time: a.createdAt })
  }
  return items
}

// ─── Activity Ticker（紧凑单行，无滚动条）─────────────────────

function ActivityTicker({ activities }: { activities: ActivityItem[] }) {
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState<"up" | "down">("up")
  const [animKey, setAnimKey] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tick = useCallback(
    (nextIdx: number, direction: "up" | "down") => {
      setDir(direction)
      setAnimKey((k) => k + 1)
      setIdx(nextIdx)
    },
    [],
  )

  const next = useCallback(() => {
    tick((idx + 1) % activities.length, "up")
  }, [idx, activities.length, tick])

  useEffect(() => {
    if (activities.length <= 1) return
    timerRef.current = setInterval(next, 8000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activities.length, next])

  if (activities.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground/40 py-1">
        <Bell className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        <span className="text-[13px]">暂无动态</span>
      </div>
    )
  }

  const item = activities[idx]
  const enterClass = dir === "up" ? "animate-slide-in-up" : "animate-slide-in-down"

  const typeLabel: Record<string, string> = {
    announcement: "公告",
    game_added: "新增游戏",
    game_updated: "更新",
    creator_joined: "创作者",
  }

  return (
    <div className="flex flex-col gap-2 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-primary/50 shrink-0" />
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/40">
          Activity
        </p>
      </div>

      {/* 单行动画 ticker — 固定高度，无滚动条 */}
      <div className="relative h-[36px] overflow-hidden">
        <div key={animKey} className={`absolute inset-0 ${enterClass}`}>
          <p className="text-[13px] text-foreground/75 leading-snug truncate">
            {typeLabel[item.type] ? `[${typeLabel[item.type]}] ` : ""}
            {item.title}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Announcement Area ────────────────────────────────────────

export function HomeAnnounceBar({ announcements, activities, siteName = "Circleica" }: HomeAnnounceBarProps) {
  const [cur, setCur] = useState(0)
  const len = announcements.length
  const next = useCallback(() => setCur((i) => (i + 1) % len), [len])

  const ann = announcements[cur]
  const href = ann?.link || ann ? `/announcements/${ann.id}` : "#"

  return (
    <div className="w-full">
      {/* Content constrained for readability */}
      <div className="mx-auto" style={{ maxWidth: "1000px" }}>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
          {/* ── Announcement (open area, left) ── */}
          <div className="flex-1 min-w-0">
            {announcements.length > 0 ? (
              <div>
                {/* Label */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-[3px] w-[3px] rounded-full bg-primary/50" />
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/40">
                    Announcement
                  </p>
                </div>

                {/* Thin separator */}
                <div className="h-px bg-border/40 mb-3" />

                {/* Content — pure text, no card */}
                <Link href={href} target={ann.link ? "_blank" : undefined} rel={ann.link ? "noopener noreferrer" : undefined} className="group block">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {ann.title}
                  </h2>
                  {ann.summary && (
                    <p className="hidden sm:block text-[15px] text-muted-foreground/50 line-clamp-1 mt-2 leading-relaxed">
                      {ann.summary}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground/35 mt-2.5">
                    {ann.authorName || siteName} · {timeAgo(ann.createdAt)}
                  </p>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-1">
                <span className="h-[3px] w-[3px] rounded-full bg-muted-foreground/20" />
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/25">
                  Announcement
                </p>
              </div>
            )}
          </div>

          {/* ── Activity (open area, right) ── */}
          <div className="sm:w-[200px] sm:shrink-0 sm:border-l sm:border-border/25 sm:pl-6">
            <ActivityTicker activities={activities} />
          </div>
        </div>
      </div>
    </div>
  )
}
