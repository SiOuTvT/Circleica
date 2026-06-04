export default function ProfileEditLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 px-4">
      {/* Title */}
      <div className="h-7 w-24 animate-pulse rounded bg-muted" />

      {/* Avatar */}
      <div className="flex flex-col items-center gap-4">
        <div className="h-24 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded bg-muted" />
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Submit button */}
      <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
