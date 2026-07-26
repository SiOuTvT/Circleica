import { GameCardSkeleton, GameListRowSkeleton } from "@/components/game-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Trophy } from "lucide-react"

export default function RankingLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 页头 */}
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Trophy className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <Skeleton className="h-7 w-24 rounded" />
          <Skeleton className="mt-2 h-4 w-40 rounded" />
        </div>
      </header>

      {/* 维度切换 */}
      <div className="mt-6 flex gap-1 rounded-xl bg-muted p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 flex-1 rounded-lg" />
        ))}
      </div>

      {/* TOP 3 */}
      <section className="mt-8 grid gap-5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="relative flex flex-col items-center">
            <div className="absolute -top-2 z-10 h-10 w-10 rounded-full bg-muted ring-4" />
            <div className="w-full max-w-[200px]">
              <GameCardSkeleton />
            </div>
            <Skeleton className="mt-3 h-6 w-16 rounded" />
          </div>
        ))}
      </section>

      {/* 第 4 名及以后 */}
      <section className="mt-8 space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <GameListRowSkeleton key={i} />
        ))}
      </section>
    </div>
  )
}
