import { SkeletonGrid } from "@/components/archive/skeleton-grid"

export default function CreatorDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="h-28 w-28 shrink-0 rounded-full skeleton-shimmer sm:h-32 sm:w-32" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-1/3 rounded skeleton-shimmer" />
          <div className="h-4 w-1/2 rounded skeleton-shimmer" />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-2xl bg-muted/40 px-5 py-3.5 ring-1 ring-border/50">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-20 rounded skeleton-shimmer" />
        ))}
      </div>
      <SkeletonGrid count={8} variant="creator" />
    </div>
  )
}
