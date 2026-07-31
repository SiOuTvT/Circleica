import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHeroSkeleton } from "@/components/archive/archive-hero-skeleton"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"

/** 标签图鉴加载骨架。页头走四页共用的 ArchiveHeroSkeleton。 */
export default function TagsLoading() {
  return (
    <ArchiveShell entity="tag" density="standard">
      <ArchiveHeroSkeleton />
      {/* density 与外层 ArchiveShell 声明保持一致，避免骨架自身的栅格与容器令牌错位 */}
      <ArchivePlaceholder state="loading" entity="tag" loadingCount={24} loadingDensity="standard" loadingVariant="tag" />
    </ArchiveShell>
  )
}
