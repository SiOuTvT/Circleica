"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Bell, ChevronLeft, ChevronRight, ImageOff } from "lucide-react"
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

/** Derive lightweight activity items from existing homepage data. */
export function buildActivities(announcements: AnnounceItem[]): ActivityItem[] {
  const items: ActivityItem[] = []

  // Latest announcement as activity
  if (announcements.length > 0) {
    const a = announcements[0]
    items.push({
      id: `ann-${a.id}`,
      type: "announcement",
      title: a.title,
      time: a.createdAt,
    })
  }

  // Note: In a production system, a proper activity log would exist.
  // For now we use announcement data as activity source.
  // Additional activity types (game_added, game_updated) would come
  // from a dedicated activity feed API in the future.

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

  const prev = useCallback(() => {
    tick((idx - 1 + activities.length) % activities.length, "down")
  }, [idx, activities.length, tick])

  // Auto-rotate every 8s
  useEffect(() => {
    if (activities.length <= 1) return
    timerRef.current = setInterval(next, 8000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activities.length, next])

  if (activities.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Bell className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="text-sm">暂无动态</span>
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
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
        Activity
      </p>

      <div className="relative h-[52px] sm:h-[44px] overflow-hidden">
        <div
          key={animKey}
          className={`absolute inset-0 ${enterClass}`}
        >
          <div className="flex items-center gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground/90 truncate">
                {typeLabel[item.type] ? `[${typeLabel[item.type]}] ` : ""}
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {timeAgo(item.time)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation dots + arrows */}
      {activities.length > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-foreground"
            aria-label="上一条动态"
          >
            <ChevronLeft className="h-3 w-3" strokeWidth={2} />
          </button>

          <span className="text-[11px] text-muted-foreground/50 tabular-nums">
            {String(idx + 1).padStart(2, "0")} / {String(activities.length).padStart(2, "0")}
          </span>

          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-foreground"
            aria-label="下一条动态"
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
  const [imgError, setImgError] = useState(false)
  const [cur, setCur] = useState(0)
  const len = announcements.length
  const pausedRef = useRef(false)

  const next = useCallback(() => setCur((i) => (i + 1) % len), [len])
  const prev = useCallback(() => setCur((i) => (i - 1 + len) % len), [len])

  useEffect(() => { setImgError(false) }, [cur])
  useEffect(() => {
    if (len <= 1 || pausedRef.current) return
    const t = setInterval(next, 6000)
    return () => clearInterval(t)
  }, [len, next])

  if (announcements.length === 0 && activities.length === 0) {
    return (
      <div className="w-full h-[120px] sm:h-[140px] flex items-center justify-center rounded-2xl border border-dashed border-border/50">
        <p className="text-sm text-muted-foreground/60">暂无公告与动态</p>
      </div>
    )
  }

  const ann = announcements[cur]
  const summary = ann?.summary || (ann ? stripHtml(ann.content) : "")
  const href = ann?.link || ann ? `/announcements/${ann.id}` : "#"

  return (
    <div
      className="group relative flex w-full rounded-2xl overflow-hidden"
      style={{ height: "clamp(140px, 18vh, 280px)" }}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      {/* ── 公告区 (left, ~65%) ── */}
      {announcements.length > 0 ? (
        <>
          <div className="relative w-[65%] h-full shrink-0">
            {/* Background image */}
            {ann.imageUrl && !imgError ? (
              <img
                key={`${ann.id}-${cur}`}
                src={ann.imageUrl}
                alt={ann.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading={cur === 0 ? "eager" : "lazy"}
                decoding="async"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
                <ImageOff className="h-8 w-8 text-muted-foreground/30" strokeWidth={1} />
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />

            {/* Content */}
            <Link
              href={href}
              target={ann.link ? "_blank" : undefined}
              rel={ann.link ? "noopener noreferrer" : undefined}
              className="absolute inset-0 z-[2] flex flex-col justify-end p-3 sm:p-5 cursor-pointer"
            >
              <div className="max-w-lg">
                <p className="text-[11px] font-medium text-white/60 mb-1">
                  {ann.authorName || siteName} · {timeAgo(ann.createdAt)}
                </p>
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight line-clamp-1">
                  {ann.title}
                </h2>
                {summary && (
                  <p className="hidden sm:block text-sm text-white/60 line-clamp-1 mt-1">
                    {summary}
                  </p>
                )}
              </div>
            </Link>

            {/* Navigation arrows */}
            {len > 1 && (
              <>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev() }}
                  aria-label="上一条公告"
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white/60 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hover:bg-black/40 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); next() }}
                  aria-label="下一条公告"
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white/60 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 hover:bg-black/40 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </>
            )}

            {/* Dots */}
            {len > 1 && (
              <div className="absolute bottom-3 left-3 z-10 flex gap-1.5">
                {announcements.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCur(i) }}
                    aria-label={`公告 ${i + 1}`}
                    className={`rounded-full transition-all ${
                      i === cur ? "h-1.5 w-5 bg-white/80" : "h-1 w-1 bg-white/30 hover:bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Vertical divider */}
          <div className="absolute right-[65%] top-[8%] bottom-[8%] w-px bg-gradient-to-b from-transparent via-border/60 to-transparent z-[3]" />
        </>
      ) : (
        <div className="w-[65%] h-full flex items-center justify-center border-r border-border/30">
          <p className="text-sm text-muted-foreground/50">暂无公告</p>
        </div>
      )}

      {/* ── Activity Ticker (right, ~35%) ── */}
      <div className="w-[35%] h-full shrink-0 flex items-center px-3 sm:px-5">
        <ActivityTicker activities={activities} />
      </div>
    </div>
  )
}
