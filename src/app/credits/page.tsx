import type { Metadata } from "next"
import { getMakers } from "@/lib/makers"
import { computeDensity, computeArchiveState } from "@/components/archive/density"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { HeaderSearch } from "@/components/archive/header-search"
import { StudioArchiveClient } from "@/components/archive/studio-archive-client"

export const metadata: Metadata = {
  title: "制作组图鉴 · Circleica",
  description: "浏览 Circleica 中的同人社团、小型制作组与作者档案，按名称首字索引。",
  alternates: { canonical: "/credits" },
}

/**
 * 制作组图鉴（Server Component）。
 * 页头 ArchiveHero 在 Server 层渲染（与精选合集 / 标签浏览同构），搜索 / 排序走 URL 参数，
 * 彻底消除 client chunk 缓存导致的页头尺寸不一致。列表交互（网格 / AZIndex / scroll-spy）交给 Client 组件。
 */
export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q, sort: sortRaw } = await searchParams
  const sort = sortRaw === "count" ? "count" : "name"
  const query = q?.trim() || ""

  let total = 0
  try {
    const res = await getMakers({ search: query, sort, pageSize: 1000 })
    total = res.total
  } catch {
    // 数据库不可用：返回 0，绝注入假数据
  }
  const density = computeDensity(total)
  const state = computeArchiveState(total)

  return (
    <StudioArchiveClient
      q={query}
      sort={sort}
      total={total}
      density={density}
      state={state}
      header={
        <ArchiveHero
          variant="org"
          eyebrow="studios"
          title="制作组图鉴"
          lede="这里收录同人社团、小型制作组与个人作者，按名称首字浏览全部档案。"
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
            <HeaderSearch q={query} placeholder="搜索制作组名称..." />
          }
        />
      }
    />
  )
}
