import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"

export default function CuratedCollectionsLoading() {
  return (
    <ArchiveShell entity="collection" density="standard">
      {/* 骨架页头：尺寸与真实 ArchiveHero 一致（h-12 w-12 sm:h-14 sm:w-14） */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-muted/60 sm:h-14 sm:w-14" />
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-muted/60" />
          <div className="h-7 w-28 rounded bg-muted/60" />
        </div>
      </div>
      <div className="h-4 w-64 max-w-prose rounded bg-muted/60" />
      <div className="h-10 w-full max-w-md rounded-xl bg-muted/40" />
      {/* 合集卡片骨架 */}
      <div className="space-y-4">
        <div className="h-64 w-full animate-pulse rounded-2xl bg-muted/40 sm:h-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border/50">
              <div className="h-40 w-full animate-pulse rounded-xl bg-muted/40" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted/40" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </ArchiveShell>
  )
}
