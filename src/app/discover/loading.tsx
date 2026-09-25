import { GameCardSkeleton } from "@/components/game-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Compass } from "lucide-react"

/**
 * 发现页加载骨架 —— 对齐 page.tsx 的 4 个真实区块（顺序、类型、列数均对应）：
 *
 *   1. 继续浏览  → RecentlyViewed 是**横向滑动**（flex + 卡片定宽 160px），不是网格
 *   2. 为你推荐  → ForYou 网格：2 → sm:3 → lg:4 → xl:5
 *   3. 发行时间轴 → 年份进度条行（非网格）
 *   4. 最近上新  → 网格：2 → sm:3 → lg:5 → xl:6
 *
 * 旧骨架统一画了 6 个「2 → sm:3 → md:4 → lg:5」网格区块，与实际区块数、
 * 列数档位（实际无 md:4 档、xl 还有 6 列）以及时间轴区块均不符，已同步修正。
 */
export default function DiscoverLoading() {
  return (
    <div className="space-y-10">
      {/* 页头 */}
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Compass className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <Skeleton className="h-6 w-20 rounded" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full rounded" />
        </div>
      </header>

      {/* 1. 继续浏览：横向滑动（卡片定宽 160px），非网格 */}
      <section className="space-y-4">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <div className="flex gap-3 overflow-hidden pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[160px] shrink-0">
              <GameCardSkeleton />
            </div>
          ))}
        </div>
      </section>

      {/* 2. 为你推荐：网格 2 → sm:3 → lg:4 → xl:5 */}
      <section className="space-y-4">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-28 rounded" />
        </div>
        <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* 3. 发行时间轴：年份进度条行（非网格） */}
      <section className="space-y-4">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-32 rounded" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-12 shrink-0 rounded" />
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-3.5 w-14 shrink-0 rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* 4. 最近上新：网格 2 → sm:3 → lg:5 → xl:6 */}
      <section className="space-y-4">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-28 rounded" />
        </div>
        <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
