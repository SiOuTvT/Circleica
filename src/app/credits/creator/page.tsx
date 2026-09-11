import type { Metadata } from "next"
import { countCreators } from "@/lib/creators"
import { computeDensity, computeArchiveState } from "@/components/archive/density"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { HeaderSearch } from "@/components/archive/header-search"
import { CreatorArchiveClient } from "@/components/archive/creator-archive-client"
import { ViewTabs, type ArchiveView } from "@/components/archive/view-tabs"

export const metadata: Metadata = {
  title: "创作者图鉴",
  description: "浏览 Circleica 中的创作者档案：脚本、原画、音乐、导演，以及他们的参与作品。",
  openGraph: {
    siteName: "Circleica",
    title: "创作者图鉴",
    description: "浏览 Circleica 中的创作者档案：脚本、原画、音乐、导演，以及他们的参与作品。",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "/credits/creator" },
}

/**
 * 创作者图鉴（Server Component，/credits/creator）。
 * 页头 ArchiveHero 在 Server 层渲染，搜索 / 排序走 URL 参数；列表交互交给 Client 组件。
 */
export default async function CreatorArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; view?: string }>
}) {
  const { q, sort: sortRaw, view: viewRaw } = await searchParams
  const sort = sortRaw === "count" ? "count" : "name"
  // 默认「按作品」：不带 view 参数或值非法时都落在 works
  const view: ArchiveView = viewRaw === "works" ? "works" : "name"
  const query = q?.trim() || ""

  let total = 0
  try {
    // 服务端只需要总数（页头文案 + 密度/档位推导），用轻量 count 而非 getCreators 全量聚合
    total = await countCreators({ search: query })
  } catch {
    // 数据库不可用：返回 0，绝不注入假数据
  }
  const density = computeDensity(total)
  const state = computeArchiveState(total)

  return (
    <CreatorArchiveClient
      q={query}
      sort={sort}
      view={view}
      total={total}
      density={density}
      state={state}
      header={
        <ArchiveHero
          variant="person"
          eyebrow="creators"
          title="创作者图鉴"
          lede="这里收录脚本、原画、音乐、导演等创作者，按作品浏览他们的参与名单。"
          meta={
            query ? (
              <span>
                匹配 <span className="tabular-nums text-foreground">{total}</span> 位创作者
              </span>
            ) : (
              <span>
                共 <span className="tabular-nums text-foreground">{total}</span> 位创作者
              </span>
            )
          }
          search={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <HeaderSearch q={query} placeholder="搜索创作者名称..." />
              <ViewTabs view={view} />
            </div>
          }
        />
      }
    />
  )
}
