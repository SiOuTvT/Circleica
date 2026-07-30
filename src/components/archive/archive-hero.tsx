"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Image from "next/image"
import { FileText, Layers, Tag, User, Users } from "lucide-react"
import { cn } from "@/lib/utils"

export type ArchiveHeroVariant = "org" | "person" | "series" | "detail" | "tag"

/** 各档案类型的主题色矢量图标（text-primary），用于轻量浏览页 Header，尺寸 1:1 对齐 */
const VARIANT_ICON = {
  org: Users,
  person: User,
  series: Layers,
  tag: Tag,
  detail: FileText,
} as const

interface ArchiveHeroProps {
  variant: ArchiveHeroVariant
  title: string
  eyebrow?: string
  lede?: ReactNode
  meta?: ReactNode
  cover?: string | null
  fallbackInitial?: string
  className?: string
}

/** 共享编辑式封面：矩形（组织/系列/详情）或圆形（个人）。仅详情页（提供 cover）使用 */
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
        <Image
          src={cover}
          alt=""
          fill
          className="object-cover"
          unoptimized
          sizes="128px"
          onError={() => setErrored(true)}
        />
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
 * ArchiveHero — 编辑式标题区（Design Language，四类档案 + Game Detail 共用）
 * variant: org(组织) / person(个人) / series(系列) / detail(Game Detail 契约) / tag(标签分类)
 *
 * 统一规范（以精选合集为基准，全站唯一 Header 组件）：
 *  - 浏览/列表页（不传 cover）：轻量 Header = [主题色矢量图标 text-primary] + [标题] 同行 + [描述] 在下，无灰框/无大色块。
 *  - 详情页（传 cover）：保留实体真封面 HeroCover（组织图 / 个人头像）。
 */
export function ArchiveHero({
  variant,
  title,
  eyebrow,
  lede,
  meta,
  cover,
  fallbackInitial,
  className,
}: ArchiveHeroProps) {
  const shape: "rect" | "circle" = variant === "person" ? "circle" : "rect"
  const isTag = variant === "tag"
  const initial = isTag ? "#" : fallbackInitial || title
  const Icon = VARIANT_ICON[variant]

  // 详情页：提供封面时保留 HeroCover 大图（组织/个人实体封面）
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

  // 浏览/列表页：轻量通用 Header —— 主题色矢量图标 + 标题同行 + 描述在下
  return (
    <header className={cn("flex items-start gap-3", className)}>
      <Icon className="mt-1.5 h-6 w-6 shrink-0 text-primary" strokeWidth={2} aria-hidden />
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
            {eyebrow}
          </p>
        )}
        <h1 className="break-words font-heading text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
          {title}
        </h1>
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
