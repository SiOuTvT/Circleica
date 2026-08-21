"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import Image from "next/image"
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

  if (activities.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground/40">
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
    <div className="flex flex-col gap-2.5 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-primary/50 shrink-0" />
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/40">
          Activity
        </p>
      </div>

      {/* Animated item */}
      <div className="relative h-[48px] overflow-hidden">
        <div key={animKey} className={`absolute inset-0 ${enterClass}`}>
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

      {/* Subtle nav */}
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

// ─── Main Component ───────────────────────────────────────────

export function HomeAnnounceBar({ announcements, activities, siteName = "Circleica" }: HomeAnnounceBarProps) {
  const [cur, setCur] = useState(0)
  const len = announcements.length
  const next = useCallback(() => setCur((i) => (i + 1) % len), [len])

  const ann = announcements[cur]
  const href = ann?.link || ann ? `/announcements/${ann.id}` : "#"

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5" style={{ minHeight: "280px" }}>
          {/* ── Announcement (left, wider) ── */}
          <div className="flex-[2] min-w-0">
            {announcements.length > 0 ? (
              <Link
                href={href}
                target={ann.link ? "_blank" : undefined}
                rel={ann.link ? "noopener noreferrer" : undefined}
                className="group relative block overflow-hidden rounded-2xl"
                style={{ height: "100%" }}
              >
                {/* 背景图片：恢复公告视觉 */}
                {ann.imageUrl ? (
                  <div className="absolute inset-0">
                    <Image
                      src={ann.imageUrl}
                      alt={ann.title}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, 60vw"
                      priority
                      quality={80}
                    />
                    {/* 暗色叠加层：保证文字可读性 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
                  </div>
                ) : (
                  /* 无图片时：纯色背景 + 深色渐变，保持一致的视觉语言 */
                  <div className="absolute inset-0 bg-gradient-to-br from-muted/80 to-muted/40" />
                )}

                {/* 文字内容 */}
                <div className="relative z-[2] flex flex-col justify-end h-full p-5 sm:p-6">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/50 mb-2">
                    Announcement
                  </p>
                  <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug line-clamp-2 group-hover:text-white/90 transition-colors drop-shadow-md">
                    {ann.title}
                  </h2>
                  {ann.summary && (
                    <p className="hidden sm:block text-[14px] text-white/60 line-clamp-1 mt-1.5 leading-relaxed drop-shadow-sm">
                      {ann.summary}
                    </p>
                  )}
                  <p className="text-[11px] text-white/40 mt-2">
                    {ann.authorName || siteName} · {timeAgo(ann.createdAt)}
                  </p>
                </div>

                {/* 多条公告的轮播箭头 */}
                {len > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCur((cur - 1 + len) % len) }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-[3] flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white/60 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
                      aria-label="上一条公告"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); next() }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-[3] flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white/60 backdrop-blur-sm transition-colors hover:bg-black/50 hover:text-white"
                      aria-label="下一条公告"
                    >
                      <ChevronRight className="h-4 w-4" strokeWidth={2} />
                    </button>
                    {/* 轮播指示点 */}
                    <div className="absolute bottom-3 right-4 z-[3] flex gap-1.5">
                      {announcements.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === cur ? "w-4 bg-white/80" : "w-1.5 bg-white/30"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </Link>
            ) : (
              /* 无公告空状态 */
              <div className="flex items-center justify-center rounded-2xl bg-muted/30 border border-dashed border-border/30" style={{ minHeight: "200px" }}>
                <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                  <Bell className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-[13px]">暂无公告</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Activity (right, wider) ── */}
          <div className="sm:w-[320px] sm:shrink-0">
            <div className="h-full rounded-2xl bg-muted/20 border border-border/20 p-4 sm:p-5 flex flex-col">
              <ActivityTicker activities={activities} />

              {/* Future Data 预留区域 —— 目前留空，不显示任何数据 */}
              <div className="mt-auto pt-4 border-t border-border/15">
                {/* 此处未来放置统计数据，本轮只留结构位置 */}
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
