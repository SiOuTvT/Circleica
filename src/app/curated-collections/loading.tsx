import { Skeleton } from "@/components/ui/skeleton"

export default function CuratedCollectionsLoading() {
  return (
    <div className="space-y-8 pt-4">
      {/* 页头 */}
      <Skeleton className="h-8 w-32 rounded" />

      {/* 编辑推荐（首条合集，宽卡） */}
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl sm:h-72" />
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-4 w-64 max-w-full rounded" />
      </div>

      {/* 其余合集 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border/50">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-5 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
