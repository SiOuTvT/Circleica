export default function Loading() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-background/40" />
            <div className="h-4 w-24 animate-pulse rounded bg-background/40" />
          </div>
        ))}
      </div>
    </div>
  )
}
