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
  const typeLabel: Record<string, string> = { checkin: "签到", comment: "评论", favorite: "收藏", announcement: "公告", game_added: "发布", game_updated: "更新" }
  return (
    <div className="flex flex-col min-w-0 max-h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
        <div className="flex flex-col gap-3.5 pr-1">
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-3">
              {act.avatar ? (
                <Image src={act.avatar} alt={act.username || ""} width={32} height={32} className="rounded-full object-cover shrink-0 ring-1 ring-border" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary/70">{(act.username || act.title || "?")[0]}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  {act.username && <span className="text-[15px] font-semibold text-foreground truncate">{act.username}</span>}
                  <span className="text-[15px] text-foreground/80 truncate">{act.title}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
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
    <div className="relative w-full">
      {/* 上一条 / 下一条：挂在整条横幅自己的相对定位容器上（贴在横幅两端、卡片盒外侧 32px），
          与毛玻璃卡边缘恒留 ≥24px，任何视口都不与卡片重叠。
          中线取 clamp(110px,15vh,140px) = 公告卡高 clamp(220px,30vh,280px) 的一半，
          保证箭头垂直居中于公告卡而不是整条横幅。<sm 整卡已可点，箭头直接隐藏。 */}
      {len > 1 && (
        <>
          <button onClick={() => setCur((cur - 1 + len) % len)} className="absolute -left-8 top-[clamp(110px,15vh,140px)] -translate-y-1/2 z-[5] hidden h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/40 hover:text-white sm:flex" aria-label="上一条公告"><ChevronLeft className="h-4 w-4" strokeWidth={2} /></button>
          <button onClick={next} className="absolute -right-8 top-[clamp(110px,15vh,140px)] -translate-y-1/2 z-[5] hidden h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white/70 backdrop-blur-sm transition-colors hover:bg-black/40 hover:text-white sm:flex" aria-label="下一条公告"><ChevronRight className="h-4 w-4" strokeWidth={2} /></button>
        </>
      )}
      <div className="flex flex-col lg:flex-row lg:gap-5">
        {/* ── 左侧列：公告 + 数据行 ── */}
        <div className="flex flex-col gap-4 min-w-0 lg:w-0 lg:flex-[3]">
          <div className="relative min-w-0">
            {announcements.length > 0 ? (
              <>
                <div className="group relative block overflow-hidden rounded-2xl" style={{ height: "clamp(220px, 30vh, 280px)" }}>
                  {/* 背景图：视觉层，鼠标变小手提示可交互，但点击不导航（只有毛玻璃内容区点击跳详情） */}
                  {ann.imageUrl ? (
                    <div className="absolute inset-0 cursor-pointer">
                      <Image src={ann.imageUrl} alt={ann.title} fill className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" sizes="(max-width: 1024px) 100vw, 60vw" priority quality={80} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/80 to-muted/40" />
                  )}
                  {/* 毛玻璃文字层：覆盖整卡最上层。默认光标（不可点击），仅内容区点击跳详情 */}
                  <div className="relative z-[2] flex flex-col justify-end h-full p-5 sm:p-6 cursor-pointer">
                    <Link
                      href={href}
                      target={ann.link ? "_blank" : undefined}
                      rel={ann.link ? "noopener noreferrer" : undefined}
                      className="rounded-xl bg-black/35 backdrop-blur-md px-5 py-3.5 sm:px-6 sm:py-4 block cursor-default hover:bg-black/45 transition-colors"
                    >
                      {/* 第一行：发布者头像 + 名字 + 时间（无中间小点） */}
                      <div className="flex items-center gap-3 mb-2.5">
                        {ann.authorAvatar ? (
                          <Image src={ann.authorAvatar} alt={ann.authorName || ""} width={32} height={32} className="rounded-full object-cover ring-1 ring-white/40 shrink-0" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-sm font-bold text-white shrink-0">{(ann.authorName || siteName || "?").slice(0, 1)}</span>
                        )}
                        <span className="text-[15px] text-white font-semibold truncate">{ann.authorName || siteName}</span>
                        <span className="text-[13px] text-white/75 shrink-0">{timeAgo(ann.createdAt)}</span>
                      </div>
                      {/* 第二行：标题 */}
                      <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug line-clamp-2 hover:text-primary transition-colors duration-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{ann.title}</h2>
                      {/* 第三行：摘要 */}
                      {ann.summary && <p className="hidden sm:block text-sm text-white/90 font-medium line-clamp-1 mt-1.5 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">{ann.summary}</p>}
                    </Link>
                  </div>
                </div>
                {/* 圆点指示器：位置与行为保持原样（bottom-3 right-4） */}
                {len > 1 && (
                  <div className="absolute bottom-3 right-4 z-[5] flex gap-1.5">
                    {announcements.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === cur ? "w-4 bg-white/80" : "w-1.5 bg-white/30"}`} />)}
                  </div>
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
                <p className="text-xs text-muted-foreground mt-2.5 font-medium">{stat.label}</p>
              </div>
            ))}
            <div key="reserved" className="flex-1 rounded-xl bg-card/50 border border-dashed border-border/40 px-3.5 py-3 text-center">
              <span className="text-2xl font-bold text-muted-foreground/30">—</span>
              <p className="text-xs text-muted-foreground/30 mt-1 font-medium">预留</p>
            </div>
            {/* 随机发现功能入口 */}
            {randomDiscover ? <div key="random-discover" className="contents">{randomDiscover}</div> : null}
          </div>
        </div>
        {/* ── 右侧列：Activity ── */}
        {/* 论坛动态：窄屏整块移除（它把第一部游戏卡顶到首屏之外），≥768 保持现状 */}
        <div className="rounded-2xl bg-muted/15 border border-border/15 p-4 hidden md:flex flex-col lg:w-[35%] shrink-0" style={{ height: "clamp(308px, calc(30vh + 88px), 368px)" }}>
          <ActivityList activities={activities} />
        </div>
      </div>
    </div>
  )
}
