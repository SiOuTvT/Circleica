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
  avatar?: string
  username?: string
  content?: string
}

export interface StatItem {
  label: string
  value: number | string
}

interface HomeAnnounceBarProps {
  announcements: AnnounceItem[]
  activities: ActivityItem[]
  stats: StatItem[]
  siteName?: string
}

// ─── Data ─────────────────────────────────────────────────────

export function buildActivities(announcements: AnnounceItem[]): ActivityItem[] {
  const items: ActivityItem[] = []
  if (announcements.length > 0) {
    const a = announcements[0]
    items.push({
      id: `ann-${a.id}`,
      type: "announcement",
      title: a.title,
      time: a.createdAt,
      avatar: a.authorAvatar || undefined,
      username: a.authorName || undefined,
    })
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

  return (
    <div className="flex flex-col gap-3 min-w-0">
      {/* 动态列表：展示多条 */}
      <div className="flex flex-col gap-3">
        {activities.slice(0, 4).map((act, i) => (
          <div key={act.id} className="flex items-start gap-2.5">
            {/* 头像 */}
            {act.avatar ? (
              <Image
                src={act.avatar}
                alt={act.username || ""}
                width={28}
                height={28}
                className="rounded-full object-cover shrink-0 ring-1 ring-border/50"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary/60">
                  {(act.username || act.title || "?")[0]}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                {act.username && (
                  <span className="text-[12px] font-semibold text-foreground/80 truncate">
                    {act.username}
                  </span>
                )}
                <span className="text-[12px] text-muted-foreground/50 truncate">
                  {act.title}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="h-2.5 w-2.5 text-muted-foreground/25" strokeWidth={1.5} />
                <span className="text-[10px] text-muted-foreground/35">
                  {timeAgo(act.time)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 轮播导航（多条时） */}
      {activities.length > 1 && (
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/10">
          <button
            onClick={() => tick((idx - 1 + activities.length) % activities.length, "down")}
            className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground/20 transition-colors hover:text-muted-foreground/50"
            aria-label="上一条"
          >
            <ChevronLeft className="h-3 w-3" strokeWidth={2} />
          </button>
          <span className="text-[10px] text-muted-foreground/30 tabular-nums">
            {String(idx + 1).padStart(2, "0")}/{String(activities.length).padStart(2, "0")}
          </span>
          <button
            onClick={next}
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

export function HomeAnnounceBar({ announcements, activities, stats, siteName = "Circleica" }: HomeAnnounceBarProps) {
  const [cur, setCur] = useState(0)
  const len = announcements.length
  const next = useCallback(() => setCur((i) => (i + 1) % len), [len])

  const ann = announcements[cur]
  const href = ann?.link || ann ? `/announcements/${ann.id}` : "#"

  return (
    <div className="w-full">
      {/* 桌面端：左右并排 Grid；移动端：垂直堆叠 */}
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] lg:gap-5">
        {/* ── 左侧列：公告 + 数据行 ── */}
        <div className="flex flex-col gap-4 lg:gap-0 min-w-0" style={{ gridColumn: "1", gridRow: "1 / 3" }}>
          {/* 公告区 */}
          <div className="min-w-0">
            {announcements.length > 0 ? (
              <Link
                href={href}
                target={ann.link ? "_blank" : undefined}
                rel={ann.link ? "noopener noreferrer" : undefined}
                className="group relative block overflow-hidden rounded-2xl"
                style={{ height: "clamp(220px, 30vh, 280px)" }}
              >
                {/* 背景图片 */}
                {ann.imageUrl ? (
                  <div className="absolute inset-0">
                    <Image
                      src={ann.imageUrl}
                      alt={ann.title}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      priority
                      quality={80}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-muted/80 to-muted/40" />
                )}

                {/* 文字内容 */}
                <div className="relative z-[2] flex flex-col justify-end h-full p-5 sm:p-6">
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

                {/* 轮播箭头 */}
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
              <div className="flex items-center justify-center rounded-2xl bg-muted/30 border border-dashed border-border/30" style={{ height: "clamp(220px, 30vh, 280px)" }}>
                <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                  <Bell className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-[13px]">暂无公告</span>
                </div>
              </div>
            )}
          </div>

          {/* 数据行（只在公告下方） */}
          <div className="flex items-center gap-6 sm:gap-10 py-3 px-1">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[11px] text-muted-foreground/45">{stat.label}</span>
                <span className="text-xl font-bold text-foreground tabular-nums mt-0.5">
                  {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                </span>
              </div>
            ))}
            {/* 第三项预留位 */}
            <div className="flex flex-col opacity-0 pointer-events-none">
              <span className="text-[11px]">预留</span>
              <span className="text-xl font-bold">0</span>
            </div>
          </div>
        </div>

        {/* ── 右侧列：Activity（桌面端跨两行等高，移动端自然高度）── */}
        <div
          className="rounded-2xl bg-muted/15 border border-border/15 p-4 sm:p-5 flex flex-col lg:row-span-2"
        >
          <ActivityTicker activities={activities} />
        </div>
      </div>
    </div>
  )
}
