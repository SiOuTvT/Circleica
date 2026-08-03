export function AdminPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="h-10 w-32 rounded-lg bg-muted" />
      </div>
      <div className="rounded-xl border border-border p-4">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-1/4 rounded bg-muted" />
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-4 w-1/6 rounded bg-muted" />
              <div className="ml-auto h-4 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AdminCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-2">
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-8 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

export function AdminGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <div className="aspect-[1/1] sm:aspect-[3/2] bg-muted" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
