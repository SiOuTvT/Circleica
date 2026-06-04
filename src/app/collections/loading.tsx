export default function CollectionsLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>

      {/* Collection groups */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-0.5 rounded-full bg-muted" />
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="aspect-[4/5] w-full animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
