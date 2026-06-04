export default function AnnouncementDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back button */}
      <div className="h-9 w-24 animate-pulse rounded bg-muted" />

      {/* Title */}
      <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />

      {/* Meta */}
      <div className="flex gap-3">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      </div>

      {/* Cover image */}
      <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" />

      {/* Content */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${90 - i * 5}%` }} />
        ))}
      </div>
    </div>
  )
}
