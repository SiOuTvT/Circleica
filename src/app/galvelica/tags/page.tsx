import type { Metadata } from "next"
import { Tags } from "lucide-react"
import { getPopularTags } from "@/lib/galvelica"
import { GalvelicaIndexFilter } from "@/components/galvelica/galvelica-index-filter"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "标签浏览",
  description: "沿题材、世界观、剧情类型、游戏系统、社团、作者、角色属性、CP、年份与平台等维度探索同人视觉小说。",
  alternates: { canonical: "/galvelica/tags" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Galvelica",
    title: "标签浏览",
    description: "沿题材、世界观、剧情类型、游戏系统、社团、作者、角色属性、CP、年份与平台等维度探索同人视觉小说。",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "标签浏览",
    description: "沿题材、世界观、剧情类型、游戏系统、社团、作者、角色属性、CP、年份与平台等维度探索同人视觉小说。",
    images: ["/opengraph-image"],
  },
}

export default async function GalvelicaTags() {
  const tags = await getPopularTags(500)

  return (
    <div className="galvelica-index-page">
      <div className="galvelica-index-title">
        <p className="galvelica-fs-eyebrow font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">GALVELICA 标签</p>
        <h1 className="galvelica-h1 mt-2 flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          标签浏览
        </h1>
        <p className="mt-1 galvelica-fs-meta text-muted-foreground">
          共 {tags.length} 个标签。沿题材、世界观、社团、作者、角色属性、CP、年份与平台自由探索。
        </p>
      </div>

      {/* 一条完整列表：不按后台内部分组切块，内部组名也不出现在前台文案 */}
      {tags.length === 0 ? (
        <p className="galvelica-index-empty py-10 text-center galvelica-fs-meta text-muted-foreground">暂无收录的标签。</p>
      ) : (
        <GalvelicaIndexFilter
          variant="strip"
          placeholder="筛选标签"
          listClassName="galvelica-tagindex"
          items={tags.map((t) => ({ href: `/galvelica/tags/${t.id}`, label: t.name, count: t.count }))}
        />
      )}
    </div>
  )
}
