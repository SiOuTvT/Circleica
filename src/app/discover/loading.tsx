import { GameCardSkeleton } from "@/components/game-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Compass } from "lucide-react"

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

      {/* 区块占位：编辑精选 / 新上架 / 热门精选 / 系列 / 制作组 等 */}
      {Array.from({ length: 6 }).map((_, s) => (
        <section key={s} className="space-y-4">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
          </div>
          <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
