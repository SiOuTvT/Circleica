import { Skeleton } from "@/components/ui/skeleton"
import { Tag } from "lucide-react"

export default function TagsLoading() {
  return (
    <div className="space-y-6">
      {/* 页头 */}
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Tag className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <Skeleton className="h-6 w-28 rounded" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full rounded" />
        </div>
      </header>

      {/* 热门标签云 */}
      <Skeleton className="h-48 w-full rounded-2xl" />

      {/* 分类浏览 */}
      <section>
        <Skeleton className="mb-4 h-4 w-24 rounded" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </section>

      {/* 全部标签索引 */}
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  )
}
