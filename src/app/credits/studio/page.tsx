import type { Metadata } from "next"
import { getMakers } from "@/lib/makers"
import { computeDensity } from "@/components/archive/density"
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

  let total = 0
  try {
    const res = await getMakers({ search: query, sort, pageSize: 1000 })
    total = res.total
  } catch {
    // 数据库不可用：返回 0，绝注入假数据
  }
  const density = computeDensity(total)

  return (
    <StudioArchiveClient
      q={query}
      sort={sort}
      total={total}
      density={density}
      header={
        <ArchiveHero
          variant="org"
          eyebrow="studios"
          title="制作组图鉴"
          lede="同人社团 · 小型制作组 · 个人作者。按名称首字浏览全部制作组档案。"
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
