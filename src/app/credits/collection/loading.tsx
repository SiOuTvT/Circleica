import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHeroSkeleton } from "@/components/archive/archive-hero-skeleton"

/**
 * 精选合集加载骨架。
 * 页头走四页共用的 ArchiveHeroSkeleton。
 *
 * 列表部分对齐 page.tsx 的真实布局：整页统一一种「横版小卡」，一行 2 个
 * （grid-cols-1 sm:grid-cols-2），单卡为「左叠放封面区(358×140) + 右文字区」，
 * 窄屏 flex-col（封面在上）、≥sm flex-row（封面在左）。
 * 旧骨架画的是「featured 大卡 + 竖版卡片三列」，与实际不符，已同步修正。
 */
export default function CuratedCollectionsLoading() {
  return (
    <ArchiveShell entity="collection" density="standard">
      <ArchiveHeroSkeleton />
      {/* 横版合集卡骨架：一行 2 个 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-2xl bg-card px-4 py-4 ring-1 ring-border sm:flex-row sm:items-center sm:gap-4"
          >
            {/* 叠放封面区占位：358 宽 × 140 高，与 CollectionRow 一致 */}
            <div className="h-[140px] w-[358px] max-w-full shrink-0 animate-pulse rounded-lg bg-muted/40" />
            {/* 右侧文字区占位 */}
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted/40" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/40" />
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted/40" />
            </div>
          </div>
        ))}
      </div>
    </ArchiveShell>
  )
}
