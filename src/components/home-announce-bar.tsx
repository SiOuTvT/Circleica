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
    <div className="flex flex-col min-w-0 h-full min-h-0">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
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
    <div className="w-full">
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
                {/* 卡下控制行：与卡片同宽（同一容器内），左=上一条 / 中=圆点 / 右=下一条。
                    箭头改为常规 flex 流，不再 absolute：两端按钮同宽 32px + justify-between
                    ⇒ 左右对称（差值 0）；任何视口都不会与毛玻璃卡 / fixed 侧栏 / 右侧面板重叠，
                    也不会出现负 x 或被裁。与卡片留 10px（mt-2.5），箭头与圆点同在 items-center 的中线上。
                    <sm 两个箭头 hidden，圆点靠 mx-auto 居中。 */}
                {len > 1 && (
                  <div className="mt-2.5 flex items-center justify-between">
                    <button onClick={() => setCur((cur - 1 + len) % len)} className="hidden h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 ring-1 ring-foreground/15 transition-colors hover:bg-foreground/10 hover:text-foreground sm:flex" aria-label="上一条公告"><ChevronLeft className="h-4 w-4" strokeWidth={2} /></button>
                    <div className="mx-auto flex gap-1.5">
                      {announcements.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === cur ? "w-4 bg-foreground/70" : "w-1.5 bg-foreground/25"}`} />)}
                    </div>
                    <button onClick={next} className="hidden h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 ring-1 ring-foreground/15 transition-colors hover:bg-foreground/10 hover:text-foreground sm:flex" aria-label="下一条公告"><ChevronRight className="h-4 w-4" strokeWidth={2} /></button>
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
        {/* 论坛动态：窄屏整块移除（它把第一部游戏卡顶到首屏之外），≥768 保持现状。
            结构拆成「定位上下文列 + 卡体」两层：
            ≥lg 卡体走 lg:absolute lg:inset-0 铺满本列 ⇒ 本列内容高度为 0，
            行高完全由左列决定，flex 的 stretch 再把本列拉到同高 ⇒ 两列底边天然相等，
            ActivityList 也因此拿到有界高度、条目多时在卡内滚动而不顶高卡片。
            <lg 卡体回到普通文档流，由本列的 clamp 高度撑满（堆叠区高度与之前一致）。 */}
        <div className="relative hidden md:block lg:w-[35%] shrink-0 self-stretch h-[clamp(308px,30vh_+_88px,368px)] lg:h-auto">
          <div className="flex h-full flex-col rounded-2xl bg-muted/15 border border-border/15 p-4 lg:absolute lg:inset-0">
            <ActivityList activities={activities} />
          </div>
        </div>
      </div>
    </div>
  )
}
