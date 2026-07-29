export default function CreatorDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-muted sm:h-24 sm:w-24" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* StatsBar */}
      <div className="flex gap-6 rounded-2xl bg-muted/40 px-5 py-3.5 ring-1 ring-border/50">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            <div className="h-5 w-10 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Works */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/60">
            <div className="aspect-[16/10] animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
