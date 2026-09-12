import { getTagBrowserData } from "@/lib/tags-browser"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { HeaderSearch } from "@/components/archive/header-search"
import { TagGridList } from "@/components/tags/tag-grid-list"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"
import { computeDensity, computeArchiveState, DENSITY_GRID } from "@/components/archive/density"
import { cn } from "@/lib/utils"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "标签图鉴",
  description: "按标签浏览游戏，发现你感兴趣的作品类型与分类。Circleica 标签图鉴。",
  keywords: ["标签", "游戏标签", "标签浏览", "同人游戏", "Circleica"],
  openGraph: {
    siteName: "Circleica",
    title: "标签图鉴",
    description: "按标签浏览游戏，发现你感兴趣的作品类型与分类。",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "/credits/tag" },
}

export const revalidate = 300 // 5 分钟缓存

/**
 * 标签图鉴（Archive 浏览体系，tag 实体）
 * 单一视图：搜索框 + 按关联作品数倒序的标签网格（TagCard）。
 * 不再有「按分类浏览」补充区块，也不按拼音首字母分组/索引。
 * 保持 Server Component：排序在数据层完成，手机端收起/展开交给 TagGridList。
 */
export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const query = q?.trim().toLowerCase()

  const data = await getTagBrowserData()

  // 按 ?q= 过滤标签（名称）
  const tags = query
    ? data.tags.filter((t) => (t.name ?? "").toLowerCase().includes(query))
    : data.tags

  const totalTags = tags.length
  const density = computeDensity(totalTags)
  const state = computeArchiveState(totalTags)

  return (
    <ArchiveShell
      entity="tag"
      density={density}
      state={state}
      header={
        <ArchiveHero
          variant="tag"
          eyebrow="tags"
          title="标签图鉴"
          lede="按关联作品数从多到少浏览，或用搜索框直接找标签。"
          meta={
            query ? (
              <span>
                匹配 <span className="tabular-nums text-foreground">{totalTags}</span> 个标签
              </span>
            ) : (
              <span>
                共 <span className="tabular-nums text-foreground">{totalTags}</span> 个标签
              </span>
            )
          }
          search={<HeaderSearch q={q} placeholder="搜索标签名称..." />}
        />
      }
    >
      <section>
        {totalTags === 0 ? (
          <ArchivePlaceholder
            state="empty"
            entity="tag"
            message={query ? "没有匹配的标签" : "暂无已收录作品的标签"}
          />
        ) : (
          <TagGridList tags={tags} gridClass={cn("grid gap-2.5", DENSITY_GRID[density])} />
        )}
      </section>
    </ArchiveShell>
  )
}
