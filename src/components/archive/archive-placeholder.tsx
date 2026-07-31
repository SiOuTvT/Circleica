import Link from "next/link"
import { LayoutGrid, User, BookOpen, Inbox, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { SkeletonGrid } from "./skeleton-grid"
import type { ArchiveDensity } from "./density"

export type PlaceholderState = "loading" | "empty" | "error"
export type ArchiveEntity = "studio" | "creator" | "collection" | "game" | "tag"

interface ArchivePlaceholderProps {
  state: PlaceholderState
  entity: ArchiveEntity
  message?: string
  /** 错误态重试入口（服务端安全，避免 client onClick） */
  retryHref?: string
  loadingCount?: number
  loadingVariant?: "studio" | "creator" | "collection" | "tag"
  /**
   * 骨架屏栅格密度，必须与页面 computeDensity 的结果一致。
   * 不传则回落 standard —— 当页面实际是 compact/dense 时，
   * 加载完成前后列数会突变造成布局跳动（CLS），违背骨架屏"防跳动"的初衷。
   */
  loadingDensity?: ArchiveDensity
  className?: string
}

const ENTITY_LABELS: Record<ArchiveEntity, string> = {
  studio: "制作组",
  creator: "创作者",
  collection: "合集",
  game: "作品",
  tag: "标签",
}

/**
 * ArchivePlaceholder — 三态占位（Design Language，四类档案 + Game Detail 共用）
 *   loading → SkeletonGrid
 *   empty   → 居中图标 + 文案（空不崩）
 *   error   → 告警图标 + 文案 + 重试入口（可选）
 */
export function ArchivePlaceholder({
  state,
  entity,
  message,
  retryHref,
  loadingCount,
  loadingVariant,
  loadingDensity,
  className,
}: ArchivePlaceholderProps) {
  if (state === "loading") {
    return (
      <SkeletonGrid
        count={loadingCount ?? 6}
        density={loadingDensity ?? "standard"}
        variant={loadingVariant ?? "studio"}
        className={className}
      />
    )
  }

  const label = ENTITY_LABELS[entity]

  if (state === "empty") {
    const Icon = entity === "creator" ? User : entity === "collection" ? BookOpen : entity === "game" ? Inbox : LayoutGrid
    return (
      <div className={cn("flex flex-col items-center gap-3 py-20 text-center", className)}>
        <Icon className="h-12 w-12 text-muted-foreground/20" strokeWidth={1} aria-hidden />
        <p className="text-sm text-muted-foreground">{message ?? `暂无收录的${label}`}</p>
      </div>
    )
  }

  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 py-20 text-center", className)}>
      <AlertTriangle className="h-12 w-12 text-warning/40" strokeWidth={1} aria-hidden />
      <p className="text-sm text-muted-foreground">{message ?? "加载失败，请稍后重试"}</p>
      {retryHref && (
        <Link
          href={retryHref}
          className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground"
        >
          重试
        </Link>
      )}
    </div>
  )
}
