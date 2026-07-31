import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"

export default function TagDetailLoading() {
  return (
    <ArchiveShell entity="tag" density="standard">
      <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-muted/60 ring-1 ring-border/60" />
      <div className="h-7 w-40 rounded skeleton-shimmer" />
      {/* density 与外层 ArchiveShell 声明保持一致，避免骨架自身的栅格与容器令牌错位 */}
      <ArchivePlaceholder state="loading" entity="tag" loadingCount={12} loadingDensity="standard" loadingVariant="tag" />
    </ArchiveShell>
  )
}
