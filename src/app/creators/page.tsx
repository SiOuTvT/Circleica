import type { Metadata } from "next"
import { getCreators } from "@/lib/creators"
import { computeDensity, computeArchiveState } from "@/components/archive/density"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { HeaderSearch } from "@/components/archive/header-search"
import { CreatorArchiveClient } from "@/components/archive/creator-archive-client"

export const metadata: Metadata = {
  title: "创作者图鉴 · Circleica",
  description: "浏览 Circleica 中的创作者档案：脚本、原画、音乐、导演，以及他们的参与作品。",
  alternates: { canonical: "/creators" },
}

/**
 * 创作者图鉴（Server Component）。
 * 页头 ArchiveHero 在 Server 层渲染（与精选合集 / 标签浏览同构），搜索 / 排序走 URL 参数，
 * 彻底消除 client chunk 缓存导致的页头尺寸不一致。列表交互（网格 / AZIndex / scroll-spy）交给 Client 组件。
 */
export default async function CreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q, sort: sortRaw } = await searchParams
  const sort = sortRaw === "count" ? "count" : "name"
  const query = q?.trim() || ""

  let total = 0
  try {
    const res = await getCreators({ search: query, sort, pageSize: 1000 })
    total = res.total
  } catch {
    // 数据库不可用：返回 0，绝注入假数据
  }
  const density = computeDensity(total)
  const state = computeArchiveState(total)

  return (
    <CreatorArchiveClient
      q={query}
      sort={sort}
      total={total}
      density={density}
      state={state}
      header={
        <ArchiveHero
          variant="person"
          eyebrow="creators"
          title="创作者图鉴"
          lede="这里收录脚本、原画、音乐、导演等创作者，按名称首字浏览档案与参与作品。"
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
            <HeaderSearch q={query} placeholder="搜索创作者名称..." />
          }
        />
      }
    />
  )
}
