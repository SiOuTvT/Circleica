export default function ForumLoading() {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-10 w-20 animate-pulse rounded-xl bg-muted" />
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2">
        {["w-16", "w-16", "w-16"].map((w, i) => (
          <div key={i} className={`h-9 ${w} animate-pulse rounded-lg bg-muted`} />
        ))}
      </div>

      {/* Post List */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-card p-4 ring-1 ring-border">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                <div className="flex gap-3 mt-2">
                  <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
