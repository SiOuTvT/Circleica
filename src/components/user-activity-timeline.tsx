"use client"

import Image from "next/image"
import Link from "next/link"
import { FilePlus2, Pencil, Sparkles, Calendar } from "lucide-react"
import { timeAgo } from "@/lib/time-ago"
import { cn } from "@/lib/utils"

/* 用户动态时间轴（竖向）
 * 用于用户主页主区右侧竖条：左主题色圆点 + 连接竖线，
 * 每条 = 小封面(44px) + 类型图标 + 标题 + 一行描述 + 相对时间。
 * 面板自身上下自由滚动（max-h + overflow-y-auto）。
 */

export type ActivityKind = "game_published" | "resource_added" | "resource_edited" | "other"

export interface ActivityItemData {
  id: string
  kind: ActivityKind
  title: string
  description?: string
  href?: string
  coverImage?: string
  createdAt: string | Date
  /** 演示兜底标记：占位数据，避免与真实动态混淆 */
  demo?: boolean
}

const KIND_META: Record<ActivityKind, { icon: React.ElementType; label: string; color: string }> = {
  game_published: { icon: Sparkles, label: "发布了游戏", color: "var(--primary)" },
  resource_added: { icon: FilePlus2, label: "添加了资源", color: "#22c55e" },
  resource_edited: { icon: Pencil, label: "编辑了资源", color: "#f59e0b" },
  other: { icon: Calendar, label: "动态", color: "var(--muted-foreground)" },
}

function ActivityRow({ item, last }: { item: ActivityItemData; last: boolean }) {
  const meta = KIND_META[item.kind]
  const Icon = meta.icon
  const inner = (
    <>
      {/* 左侧圆点 + 竖线 */}
      <div className="relative flex w-5 shrink-0 justify-center">
        <span className="absolute top-1 h-2.5 w-2.5 rounded-full ring-2 ring-card" style={{ background: meta.color }} />
        {!last && <span className="absolute top-2 bottom-[-12px] w-px bg-border" />}
      </div>
      {/* 内容 */}
      <div className="flex min-w-0 flex-1 gap-2.5 pb-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
          {item.coverImage ? (
            <Image src={item.coverImage} alt="" width={44} height={44} className="h-full w-full object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ color: meta.color }}><Icon className="h-5 w-5" strokeWidth={2} /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} strokeWidth={2} />
            <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{item.title}</p>
          {item.description && <p className="truncate text-xs text-muted-foreground">{item.description}</p>}
          <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </>
  )
  return item.href ? (
    <Link href={item.href} className="group flex gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-secondary/50">
      {inner}
    </Link>
  ) : (
    <div className="flex gap-2.5 rounded-lg px-1 py-1">{inner}</div>
  )
}

export function UserActivityTimeline({ items, className }: { items: ActivityItemData[]; className?: string }) {
  if (!items || items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
        <Calendar className="mb-2 h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
        <p className="text-xs text-muted-foreground">暂无动态</p>
      </div>
    )
  }
  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((it, i) => (
        <ActivityRow key={it.id} item={it} last={i === items.length - 1} />
      ))}
    </div>
  )
}

/** 演示兜底动态：真实数据为空时注入，让你能真实看到时间轴效果（链接为占位） */
export function buildDemoActivities(username: string): ActivityItemData[] {
  const now = Date.now()
  const ago = (h: number) => new Date(now - h * 3600 * 1000).toISOString()
  return [
    { id: "demo-1", kind: "game_published", title: `${username} 发布了《星屑协奏曲》`, description: "一款治愈系百合视觉小说", href: "#", createdAt: ago(5), demo: true },
    { id: "demo-2", kind: "resource_added", title: "在《夜莺挽歌》下添加了资源", description: "汉化补丁 v1.2（全文本）", href: "#", createdAt: ago(30), demo: true },
    { id: "demo-3", kind: "resource_edited", title: "编辑了《夜莺挽歌》的资源", description: "修正第 3 章 typo", href: "#", createdAt: ago(72), demo: true },
    { id: "demo-4", kind: "game_published", title: `${username} 发布了《薄荷糖与盛夏》`, description: "短篇校园甜文", href: "#", createdAt: ago(160), demo: true },
  ]
}
