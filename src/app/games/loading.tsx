import { GameCardSkeleton } from "@/components/game-card"

export default function GamesLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="skeleton-shimmer h-7 w-28 rounded" />
        <div className="skeleton-shimmer mt-2 h-4 w-64 max-w-full rounded" />
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="skeleton-shimmer h-4 w-24 rounded" />
        <div className="skeleton-shimmer h-8 w-40 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
        {Array.from({ length: 12 }).map((_, i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
