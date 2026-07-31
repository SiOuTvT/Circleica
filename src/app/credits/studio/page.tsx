import type { Metadata } from "next"
import { countMakers } from "@/lib/makers"
import { computeDensity, computeArchiveState } from "@/components/archive/density"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { HeaderSearch } from "@/components/archive/header-search"
import { StudioArchiveClient } from "@/components/archive/studio-archive-client"

export const metadata: Metadata = {
  title: "制作组图鉴 · Circleica",
  description: "浏览 Circleica 中的同人社团、小型制作组与作者档案，按名称首字索引。",
  alternates: { canonical: "/credits/studio" },
}

/**
 * 制作组列表（/credits/studio，Server Component）。
 * 与 /credits 同构：页头 ArchiveHero 在 Server 层渲染，搜索 / 排序走 URL 参数。
 */
export default async function StudioArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const { q, sort: sortRaw } = await searchParams
  const sort = sortRaw === "count" ? "count" : "name"
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
