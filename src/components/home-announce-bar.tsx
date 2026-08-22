"use client"

import type { ReactNode } from "react"
import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Bell, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { timeAgo } from "@/lib/time-ago"

interface AnnounceItem {
  id: string; title: string; summary: string; content: string; imageUrl: string; link: string
  createdAt: string; authorName: string; authorAvatar: string; isPinned: boolean
}

export interface ActivityItem {
  id: string; type: string; title: string; time: string
  avatar?: string; username?: string; content?: string
}

export interface StatItem { label: string; value: number | string }

interface HomeAnnounceBarProps {
  announcements: AnnounceItem[]
  activities: ActivityItem[]
  stats: StatItem[]
  randomDiscover?: ReactNode
  siteName?: string
}

export function buildActivities(announcements: AnnounceItem[]): ActivityItem[] {
  const items: ActivityItem[] = []
  if (announcements.length > 0) {
    const a = announcements[0]
    items.push({ id: `ann-${a.id}`, type: "announcement", title: a.title, time: a.createdAt, avatar: a.authorAvatar || undefined, username: a.authorName || undefined })
  }
  return items
}

function ActivityList({ activities }: { activities: ActivityItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  if (activities.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground/40 py-4">
        <Bell className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span className="text-sm">暂无动态</span>
      </div>
    )
  }
  const typeLabel: Record<string, string> = { checkin: "签到", comment: "评论", favorite: "收藏", announcement: "公告" }
  return (
    <div className="flex flex-col min-w-0 max-h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        <div className="flex flex-col gap-3.5 pr-1">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3">
              {act.avatar ? (
                <Image src={act.avatar} alt={act.username || ""} width={32} height={32} className="rounded-full object-cover shrink-0 ring-1 ring-border/50" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary/70">{(act.username || act.title || "?")[0]}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  {act.username && <span className="text-[15px] font-semibold text-foreground truncate">{act.username}</span>}
                  <span className="text-[15px] text-foreground/70 truncate">{act.title}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {typeLabel[act.type] && <span className="text-xs px-1.5 py-0.5 rounded bg-muted/80 text-foreground/60 font-medium">{typeLabel[act.type]}</span>}
                  <Clock className="h-3 w-3 text-muted-foreground/40" strokeWidth={1.5} />
                  <span className="text-xs text-muted-foreground/55">{timeAgo(act.time)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HomeAnnounceBar({ announcements, activities, stats, randomDiscover, siteName = "Circleica" }: HomeAnnounceBarProps) {
  const [cur, setCur] = useState(0)
  const len = announcements.length
  const next = useCallback(() => setCur((i) => (i + 1) % len), [len])
  const ann = announcements[cur]
  const href = ann?.link || ann ? `/announcements/${ann.id}` : "#"

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row lg:gap-5">
        {/* ── 左侧列：公告 + 数据行 ── */}
        <div className="flex flex-col gap-4 min-w-0 lg:w-0 lg:flex-[3]">
          <div className="relative min-w-0">
            {announcements.length > 0 ? (
              <>
                <div className="group relative block overflow-hidden rounded-2xl" style={{ height: "clamp(220px, 30vh, 280px)" }}>
                  {/* 整个区域点击跳转 */}
                  <Link href={href} target={ann.link ? "_blank" : undefined} rel={ann.link ? "noopener noreferrer" : undefined} className="absolute inset-0 z-[1]" aria-label={`查看公告：${ann.title}`} />
                  {/* 背景图 */}
                  {ann.imageUrl ? (
                    <div className="absolute inset-0 cursor-pointer">
                      <Image src={ann.imageUrl} alt={ann.title} fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" sizes="(max-width: 1024px) 100vw, 60vw" priority quality={80} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/80 to-muted/40 cursor-pointer" />
                  )}
                  {/* 毛玻璃文字层：默认鼠标箭头，hover 时标题变主题色 */}
                  <div className="relative z-[2] flex flex-col justify-end h-full p-5 sm:p-6 cursor-default">
                    <div className="rounded-xl bg-black/35 backdrop-blur-md px-5 py-3.5 sm:px-6 sm:py-4 pointer-events-none">
                      <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">{ann.title}</h2>
                      {ann.summary && <p className="hidden sm:block text-sm text-white/80 line-clamp-1 mt-1.5 leading-relaxed">{ann.summary}</p>}
                      <p className="text-xs text-white/60 mt-2">{ann.authorName || siteName} · {timeAgo(ann.createdAt)}</p>
                    </div>
                  </div>
                </div>
                {len > 1 && (
                  <>
                    <button onClick={() => setCur((cur - 1 + len) % len)} className="absolute left-2 top-1/2 -translate-y-1/2 z-[5] flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/40 hover:text-white" aria-label="上一条公告"><ChevronLeft className="h-4 w-4" strokeWidth={2} /></button>
                    <button onClick={() => next()} className="absolute right-2 top-1/2 -translate-y-1/2 z-[5] flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/40 hover:text-white" aria-label="下一条公告"><ChevronRight className="h-4 w-4" strokeWidth={2} /></button>
                    <div className="absolute bottom-3 right-4 z-[5] flex gap-1.5">
                      {announcements.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === cur ? "w-4 bg-white/80" : "w-1.5 bg-white/30"}`} />)}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center rounded-2xl bg-muted/30 border border-dashed border-border/30" style={{ height: "clamp(220px, 30vh, 280px)" }}>
                <div className="flex flex-col items-center gap-2 text-muted-foreground/30"><Bell className="h-6 w-6" strokeWidth={1.5} /><span className="text-sm">暂无公告</span></div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {stats.map((stat, i) => (
              <div key={i} className="flex-1 rounded-xl bg-card border border-border px-3.5 py-3 text-center shadow-sm">
                <span className="text-2xl font-bold text-foreground tabular-nums">{typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}</span>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
            <div className="flex-1 rounded-xl bg-card/50 border border-dashed border-border/40 px-3.5 py-3 text-center">
              <span className="text-2xl font-bold text-muted-foreground/30">—</span>
              <p className="text-xs text-muted-foreground/30 mt-1 font-medium">预留</p>
            </div>
            {/* 随机发现功能入口 */}
            {randomDiscover}
          </div>
        </div>
        {/* ── 右侧列：Activity ── */}
        <div className="rounded-2xl bg-muted/15 border border-border/15 p-4 flex flex-col lg:w-[35%] shrink-0" style={{ height: "clamp(308px, calc(30vh + 88px), 368px)" }}>
          <ActivityList activities={activities} />
        </div>
      </div>
    </div>
  )
}
