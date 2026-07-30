"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { Layers, Users, User, Tag as TagIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type ArchiveHeroVariant = "org" | "person" | "series" | "detail" | "tag"

interface ArchiveHeroProps {
  variant: ArchiveHeroVariant
  title: string
  eyebrow?: string
  lede?: ReactNode
  meta?: ReactNode
  cover?: string | null
  fallbackInitial?: string
  /** 浏览页：介绍文案下方的搜索框 / 筛选区（与精选合集功能对齐） */
  search?: ReactNode
  className?: string
}

const ICON_MAP: Record<ArchiveHeroVariant, typeof Layers> = {
  series: Layers,
  org: Users,
  person: User,
  tag: TagIcon,
  detail: Layers,
}

/**
 * 共享编辑式封面：矩形（组织/系列/标签/详情）或圆形（个人）。
 * 无封面时渲染主题色渐变块 + 首字兜底；有封面（详情页）时渲染实体真封面。
 */
function HeroCover({
  cover,
  initial,
  shape,
}: {
  cover: string | null | undefined
  initial: string
  shape: "rect" | "circle"
}) {
  const [errored, setErrored] = useState(false)
  const shapeCls =
    shape === "circle"
      ? "h-20 w-20 shrink-0 rounded-full sm:h-24 sm:w-24"
      : "h-28 w-28 shrink-0 rounded-2xl sm:h-32 sm:w-32"
  if (cover && !errored) {
    return (
      <div className={cn("relative overflow-hidden bg-muted ring-1 ring-border/60", shapeCls)}>
        {/* 详情页实体真封面，由调用方提供 coverImage */}
        <img src={cover} alt="" className="h-full w-full object-cover" />
      </div>
    )
  }
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-border/60",
        shapeCls,
      )}
    >
      <span className={cn("font-heading font-bold text-primary/30", shape === "circle" ? "text-2xl" : "text-3xl")}>
        {initial.slice(0, 1)}
      </span>
    </div>
  )
}

/**
 * ArchiveHero — 全站唯一页头（以「精选合集」为终极标杆，四页像素级克隆）
 *
 * 浏览页（不传 cover）：
 *  - 左：放大的主题色矢量图标（text-primary，无灰底框），高度与右侧「英文副标题 + 主标题」两行文字对齐
 *  - 右三层：英文副标题（顶部）→ 衬线大字主标题（中部，显著放大）→ 介绍文案（底部）
 *  - 搜索框 / 筛选区紧随介绍文案下方
 *
 * 详情页（传 cover）：保留实体真封面（HeroCover），排版另行适配。
 */
export function ArchiveHero({
  variant,
  title,
  eyebrow,
  lede,
  meta,
  cover,
  fallbackInitial,
  search,
  className,
}: ArchiveHeroProps) {
  const shape: "rect" | "circle" = variant === "person" ? "circle" : "rect"
  const isTag = variant === "tag"
  const initial = isTag ? "#" : fallbackInitial || title
  const Icon = ICON_MAP[variant] ?? Layers

  // 详情页：实体真封面（保留原有排版，不进入浏览页重构范围）
  if (cover) {
    return (
      <header
        className={cn(
          "flex flex-col gap-5",
          variant === "person" && "sm:flex-row sm:items-center",
          className,
        )}
      >
        <HeroCover cover={cover} initial={initial} shape={shape} />
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              {eyebrow}
            </p>
          )}
          <h1 className="break-words font-heading text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
          {lede && <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{lede}</p>}
          {meta && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
      </header>
    )
  }

  // 浏览页：放大图标 + 三层文字 + 搜索（统一视觉基因）
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center text-primary sm:h-14 sm:w-14">
          <Icon className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">{eyebrow}</p>
          )}
          <h1 className="break-words font-heading text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {title}
          </h1>
        </div>
      </div>
      {lede && (
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{lede}</p>
      )}
      {search && <div className="mt-1">{search}</div>}
      {meta && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">{meta}</div>
      )}
    </header>
  )
}
