import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"

export default function TagDetailLoading() {
  return (
    <ArchiveShell entity="tag" density="standard">
      <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-muted/60 ring-1 ring-border/60" />
      <div className="h-7 w-40 rounded skeleton-shimmer" />
      <ArchivePlaceholder state="loading" entity="tag" loadingCount={12} loadingVariant="tag" />
    </ArchiveShell>
  )
}
