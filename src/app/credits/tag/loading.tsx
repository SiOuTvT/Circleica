import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"

export default function TagsLoading() {
  return (
    <ArchiveShell entity="tag" density="standard">
      {/* 骨架页头：尺寸与真实 ArchiveHero 一致（h-12 w-12 sm:h-14 sm:w-14） */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-muted/60 sm:h-14 sm:w-14" />
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-muted/60" />
          <div className="h-7 w-28 rounded bg-muted/60" />
        </div>
      </div>
      <div className="h-4 w-64 max-w-prose rounded bg-muted/60" />
      <div className="h-10 w-full max-w-md rounded-xl bg-muted/40" />
      {/* density 与外层 ArchiveShell 声明保持一致，避免骨架自身的栅格与容器令牌错位 */}
      <ArchivePlaceholder state="loading" entity="tag" loadingCount={24} loadingDensity="standard" loadingVariant="tag" />
    </ArchiveShell>
  )
}
