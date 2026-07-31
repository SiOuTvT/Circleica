import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHeroSkeleton } from "@/components/archive/archive-hero-skeleton"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"

/**
 * 创作者图鉴加载骨架。
 *
 * 与 /credits/studio 的骨架同构，只有 entity / variant 不同。
 * 这个文件之前同样是缺的，加载时会回落到根级的首页骨架。
 *
 * 覆盖页面 Server Component 里那次 getCreators() 计数查询；
 * 之后 CreatorArchiveClient 在浏览器侧接手，参数与它的 loading 占位一致
 * （standard 密度 loadingCount=8，variant=creator）。
 */
export default function CreatorArchiveLoading() {
  return (
    <ArchiveShell entity="creator" density="standard">
      <ArchiveHeroSkeleton />
      <ArchivePlaceholder
        state="loading"
        entity="creator"
        loadingCount={8}
        loadingDensity="standard"
        loadingVariant="creator"
      />
    </ArchiveShell>
  )
}
