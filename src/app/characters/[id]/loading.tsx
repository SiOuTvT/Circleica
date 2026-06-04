export default function CharacterDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="rounded-2xl bg-card ring-1 ring-border p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="h-48 w-36 sm:h-64 sm:w-48 shrink-0 animate-pulse rounded-xl bg-muted" />

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div className="h-7 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Related games */}
      <div className="rounded-2xl bg-card ring-1 ring-border p-5">
        <div className="h-5 w-24 animate-pulse rounded bg-muted mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
