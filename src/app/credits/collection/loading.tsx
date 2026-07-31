import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHeroSkeleton } from "@/components/archive/archive-hero-skeleton"

/**
 * 精选合集加载骨架。
 * 页头走四页共用的 ArchiveHeroSkeleton；列表部分是本页独有的
 * 「featured 大卡 + 三列网格」结构，与 page.tsx 的真实布局对应，故保留手写。
 */
export default function CuratedCollectionsLoading() {
  return (
    <ArchiveShell entity="collection" density="standard">
      <ArchiveHeroSkeleton />
      {/* 合集卡片骨架 */}
      <div className="space-y-4">
        <div className="h-64 w-full animate-pulse rounded-2xl bg-muted/40 sm:h-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border/50">
              <div className="h-40 w-full animate-pulse rounded-xl bg-muted/40" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted/40" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </ArchiveShell>
  )
}
