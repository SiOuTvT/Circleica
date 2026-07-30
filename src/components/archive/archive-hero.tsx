"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Image from "next/image"
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
  className?: string
}

/** 共享编辑式封面：矩形（组织/系列/详情）或圆形（个人） */
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
 * tag variant — taxonomy 定位：展示标签名称、分组、描述、关联游戏数，不模拟实体 Hero（无封面）。
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
  return (
    <header
      className={cn(
        "flex flex-col gap-5",
        (variant === "person" || isTag) && "sm:flex-row sm:items-center",
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
