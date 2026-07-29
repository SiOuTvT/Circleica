import { cn } from "@/lib/utils"
import type { ArchiveDensity } from "./density"

interface SkeletonGridProps {
  count?: number
  density?: ArchiveDensity
  variant?: "studio" | "creator" | "collection"
  className?: string
}

const gridByDensity: Record<ArchiveDensity, string> = {
  compact: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  standard: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  dense: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
}

function SkeletonCard({ variant }: { variant: "studio" | "creator" | "collection" }) {
  if (variant === "creator") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/60">
        <div className="h-12 w-12 shrink-0 rounded-full skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/2 rounded skeleton-shimmer" />
          <div className="h-3 w-1/3 rounded skeleton-shimmer" />
        </div>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/60">
      <div className="aspect-[16/10] skeleton-shimmer" />
      <div className="space-y-2 p-3.5">
        <div className="h-3.5 w-2/3 rounded skeleton-shimmer" />
        <div className="h-3 w-1/3 rounded skeleton-shimmer" />
      </div>
    </div>
  )
}

/**
 * SkeletonGrid — 骨架屏（Design Language，四类档案 + Game Detail 共用）
 * 形状对齐 EntityCard，避免加载完成前后布局跳动。
 */
export function SkeletonGrid({
  count = 6,
  density = "standard",
  variant = "studio",
  className,
}: SkeletonGridProps) {
  return (
    <div className={cn("grid gap-3", gridByDensity[density], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  )
}
