import { Skeleton } from "@/components/ui/skeleton"

export default function CuratedCollectionDetailLoading() {
  return (
    <div className="space-y-8 pt-4">
      {/* 顶部区域 */}
      <div className="space-y-6">
        {/* 封面 hero */}
        <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: "21 / 9" }} />

        {/* 合集信息 */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded" />
          <Skeleton className="h-4 w-80 max-w-full rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>

      {/* 游戏游廊 */}
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-2xl bg-card p-4 ring-1 ring-border/50 sm:p-5">
            <Skeleton className="w-20 shrink-0 rounded-xl sm:w-24" style={{ aspectRatio: "3 / 4" }} />
            <div className="flex flex-1 flex-col justify-center gap-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
