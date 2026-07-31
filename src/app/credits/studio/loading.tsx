import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHeroSkeleton } from "@/components/archive/archive-hero-skeleton"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"

/**
 * 制作组图鉴加载骨架。
 *
 * 这个文件之前是缺的 —— 缺 loading.tsx 会向上回落到最近的祖先 loading，
 * 而那时根级 loading.tsx 画的是首页布局（品牌卡 + 公告位 + 游戏网格），
 * 于是打开制作组图鉴会先闪一下首页骨架，直接违反 Archive 四页同源。
 *
 * 覆盖的窗口是页面 Server Component 里那次 countMakers() 查询；
 * 之后 StudioArchiveClient 在浏览器侧接手，渲染它自己的 loading 占位。
 * 两段的 ArchiveShell entity/density 与 SkeletonGrid 参数保持一致
 * （client 侧 standard 密度同样是 loadingCount=8），衔接时不跳动。
 */
export default function StudioArchiveLoading() {
  return (
    <ArchiveShell entity="studio" density="standard">
      <ArchiveHeroSkeleton />
      <ArchivePlaceholder
        state="loading"
        entity="studio"
        loadingCount={8}
        loadingDensity="standard"
        loadingVariant="studio"
      />
    </ArchiveShell>
  )
}
