"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { timeAgo } from "@/lib/time-ago"
import { stripHtml } from "@/lib/sanitize"

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
}

interface HomeAnnounceBarProps {
  announcements: AnnounceItem[]
  activities: ActivityItem[]
  siteName?: string
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

// ─── Activity Ticker ──────────────────────────────────────────

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

  // Auto-rotate every 8s
  useEffect(() => {
    if (activities.length <= 1) return
    timerRef.current = setInterval(next, 8000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activities.length, next])

  if (activities.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground/50">
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
    <div className="flex flex-col gap-3 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-primary/50 shrink-0" />
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/40">
          Activity
        </p>
      </div>

      {/* Animated item */}
      <div className="relative h-[48px] overflow-hidden">
        <div
          key={animKey}
          className={`absolute inset-0 ${enterClass}`}
        >
          <div className="flex items-start gap-2">
            <span className="mt-1.5 h-[3px] w-[3px] rounded-full bg-foreground/15 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-foreground/75 leading-snug">
                {typeLabel[item.type] ? `[${typeLabel[item.type]}] ` : ""}
                {item.title}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Clock className="h-2.5 w-2.5 text-muted-foreground/30" strokeWidth={1.5} />
                <span className="text-[11px] text-muted-foreground/40">
                  {timeAgo(item.time)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle navigation */}
      {activities.length > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); tick((idx - 1 + activities.length) % activities.length, "down") }}
            className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground/20 transition-colors hover:text-muted-foreground/50"
            aria-label="上一条"
          >
            <ChevronLeft className="h-3 w-3" strokeWidth={2} />
          </button>
          <span className="text-[10px] text-muted-foreground/30 tabular-nums">
            {String(idx + 1).padStart(2, "0")}/{String(activities.length).padStart(2, "0")}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground/20 transition-colors hover:text-muted-foreground/50"
            aria-label="下一条"
          >
            <ChevronRight className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Announcement Area ────────────────────────────────────────

export function HomeAnnounceBar({ announcements, activities, siteName = "Circleica" }: HomeAnnounceBarProps) {
  const [cur, setCur] = useState(0)
  const len = announcements.length

  const next = useCallback(() => setCur((i) => (i + 1) % len), [len])

  const ann = announcements[cur]
  const summary = ann?.summary || (ann ? stripHtml(ann.content) : "")
  const href = ann?.link || ann ? `/announcements/${ann.id}` : "#"

  return (
    <div className="w-full">
      <div className="mx-auto" style={{ maxWidth: "1100px" }}>
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-8">
        {/* ── Announcement (open area, left) ── */}
        <div className="flex-[3] min-w-0">
          {announcements.length > 0 ? (
            <div>
              {/* Label */}
              <div className="flex items-center gap-2 mb-3">
                <span className="h-[3px] w-[3px] rounded-full bg-primary/60" />
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/50">
                  Announcement
                </p>
              </div>

              {/* Thin accent line */}
              <div className="h-px bg-gradient-to-r from-border/80 via-border/40 to-transparent mb-4" />

              {/* Content — pure text, no background, no card */}
              <Link
                href={href}
                target={ann.link ? "_blank" : undefined}
                rel={ann.link ? "noopener noreferrer" : undefined}
                className="group block"
              >
                <h2 className="text-2xl sm:text-[32px] font-bold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {ann.title}
                </h2>
                {summary && (
                  <p className="hidden sm:block text-base text-muted-foreground/55 line-clamp-1 mt-3 leading-relaxed">
                    {summary}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground/40 mt-3 tracking-wide">
                  {ann.authorName || siteName} · {timeAgo(ann.createdAt)}
                </p>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 py-1">
              <span className="h-[3px] w-[3px] rounded-full bg-muted-foreground/20" />
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/30">
                Announcement
              </p>
            </div>
          )}
        </div>

        {/* ── Activity (open area, right) ── */}
        <div className="sm:flex-[2] sm:min-w-0 sm:border-l sm:border-border/25 sm:pl-6">
          <ActivityTicker activities={activities} />
        </div>
      </div>
        </div>
      </div>
  )
}
