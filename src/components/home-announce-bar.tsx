"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Bell, ChevronLeft, ChevronRight, ImageOff, Clock } from "lucide-react"
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
      <div className="flex items-center gap-2 text-muted-foreground/60">
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
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-primary/60" />
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/50">
          Activity
        </p>
      </div>

      <div className="relative h-[48px] overflow-hidden">
        <div
          key={animKey}
          className={`absolute inset-0 ${enterClass}`}
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground/85 truncate leading-snug">
                {typeLabel[item.type] ? `[${typeLabel[item.type]}] ` : ""}
                {item.title}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="h-2.5 w-2.5 text-muted-foreground/40" strokeWidth={1.5} />
                <p className="text-[11px] text-muted-foreground/50">
                  {timeAgo(item.time)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Announcement Area ────────────────────────────────────────

export function HomeAnnounceBar({ announcements, activities, siteName = "Circleica" }: HomeAnnounceBarProps) {
  const [imgError, setImgError] = useState(false)
  const [cur, setCur] = useState(0)
  const len = announcements.length
  const pausedRef = useRef(false)

  const next = useCallback(() => setCur((i) => (i + 1) % len), [len])

  useEffect(() => { setImgError(false) }, [cur])
  useEffect(() => {
    if (len <= 1 || pausedRef.current) return
    const t = setInterval(next, 6000)
    return () => clearInterval(t)
  }, [len, next])

  const ann = announcements[cur]
  const summary = ann?.summary || (ann ? stripHtml(ann.content) : "")
  const href = ann?.link || ann ? `/announcements/${ann.id}` : "#"

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-0">
        {/* ── Announcement (open area, left) ── */}
        <div className="flex-1 min-w-0">
          {announcements.length > 0 ? (
            <div className="group/ann relative">
              {/* Background image */}
              {ann.imageUrl && !imgError && (
                <div className="absolute inset-0 -z-10">
                  <img
                    key={`${ann.id}-${cur}`}
                    src={ann.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover rounded-xl"
                    loading={cur === 0 ? "eager" : "lazy"}
                    decoding="async"
                    onError={() => setImgError(true)}
                  />
                  {/* Subtle dark overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent rounded-xl" />
                </div>
              )}

              {/* Content */}
              <Link
                href={href}
                target={ann.link ? "_blank" : undefined}
                rel={ann.link ? "noopener noreferrer" : undefined}
                className="relative block p-4 sm:p-5 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="h-1 w-1 rounded-full bg-primary/70" />
                  <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
                    Announcement
                  </p>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight line-clamp-1 group-hover/ann:text-primary transition-colors">
                  {ann.title}
                </h2>
                {summary && (
                  <p className="hidden sm:block text-sm text-muted-foreground/70 line-clamp-1 mt-1.5 leading-relaxed">
                    {summary}
                  </p>
                )}

                <p className="text-[11px] text-muted-foreground/50 mt-2">
                  {ann.authorName || siteName} · {timeAgo(ann.createdAt)}
                </p>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 py-3">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/40">
                Announcement
              </p>
              <span className="text-sm text-muted-foreground/40 ml-2">暂无公告</span>
            </div>
          )}
        </div>

        {/* ── Activity (open area, right) ── */}
        <div className="sm:w-[200px] sm:shrink-0 sm:border-l sm:border-border/30 sm:pl-4">
          <ActivityTicker activities={activities} />
        </div>
      </div>
    </div>
  )
}
