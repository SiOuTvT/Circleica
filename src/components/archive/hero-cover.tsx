"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * 共享编辑式封面：矩形（组织/系列/标签/详情）或圆形（个人）。
 * 无封面时渲染主题色渐变块 + 首字兜底；有封面（详情页）时渲染实体真封面（带 onError 兜底）。
 * 单独抽为 client 组件，使 ArchiveHero 本身可在 Server Component 中渲染（脱离浏览器 chunk 缓存）。
 */
export function HeroCover({
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
        {/* 详情页实体真封面，由调用方提供 coverImage。
            这里刻意用原生 <img> 而非 next/image：封面来源是 R2 / VNDB 等外部域，
            走 next/image 需要为每个可能的图源维护 remotePatterns，任一遗漏就是整块封面裂图；
            而这里已有 onError → 首字母渐变占位的降级，比优化收益更重要。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt=""
          className="h-full w-full object-cover"
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
