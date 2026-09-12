import type { Metadata } from "next"
import { countMakers } from "@/lib/makers"
import { computeDensity, computeArchiveState } from "@/components/archive/density"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { HeaderSearch } from "@/components/archive/header-search"
import { StudioArchiveClient } from "@/components/archive/studio-archive-client"
import { ViewTabs, type ArchiveView } from "@/components/archive/view-tabs"

export const metadata: Metadata = {
  title: "制作组图鉴",
  description: "浏览 Circleica 中的同人社团与小型制作组，按作品查看各组的名下档案。",
  openGraph: {
    siteName: "Circleica",
    title: "制作组图鉴",
    description: "浏览 Circleica 中的同人社团与小型制作组，按作品查看各组的名下档案。",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "/credits/studio" },
}

/**
 * 制作组列表（/credits/studio，Server Component）。
 * 与 /credits 同构：页头 ArchiveHero 在 Server 层渲染，搜索 / 排序走 URL 参数。
 */
export default async function StudioArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; view?: string }>
}) {
  const { q, sort: sortRaw, view: viewRaw } = await searchParams
  const sort = sortRaw === "count" ? "count" : "name"
  // 默认「按作品」：不带 view 参数或值非法时都落在 works
  const view: ArchiveView = viewRaw === "name" ? "name" : "works"
  const query = q?.trim() || ""

  // 服务端只需要总数（页头文案 + 密度/档位推导），列表数据由 client 组件按 q/sort 拉取。
  // 这里用轻量 count 而非 getMakers 全量聚合，避免同一份重查询在服务端白跑一遍。
  let total = 0
  try {
    total = await countMakers({ search: query })
  } catch {
    // 数据库不可用：返回 0，绝不注入假数据
  }
  const density = computeDensity(total)
  const state = computeArchiveState(total)

  return (
    <StudioArchiveClient
      q={query}
      sort={sort}
      view={view}
      total={total}
      density={density}
      state={state}
      header={
        <ArchiveHero
          variant="org"
          title="制作组图鉴"
          lede="这里收录同人社团与小型制作组，按作品浏览；也可以切到按首字逐个查看。"
          meta={
            query ? (
              <span>
                匹配 <span className="tabular-nums text-foreground">{total}</span> 个制作组
              </span>
            ) : (
              <span>
                共 <span className="tabular-nums text-foreground">{total}</span> 个制作组
              </span>
            )
          }
          search={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <HeaderSearch q={query} placeholder="搜索制作组名称..." />
              <ViewTabs view={view} />
            </div>
          }
        />
      }
    />
  )
}
