import type { Metadata } from "next"
import { Tags } from "lucide-react"
import Link from "next/link"
import { getPopularTags } from "@/lib/galvelica"

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
    <div className="space-y-8">
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">GALVELICA 标签</p>
        <h1 className="galvelica-h1 mt-2 flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          标签浏览
        </h1>
        <p className="mt-1 galvelica-fs-meta text-muted-foreground">
          共 {tags.length} 个标签。沿题材、世界观、社团、作者、角色属性、CP、年份与平台自由探索。
        </p>
      </div>

      {/* 一条完整列表：不按后台内部分组切块，内部组名也不出现在前台文案 */}
      <div className="galvelica-tagindex">
        <div className="galvelica-strip">
          {tags.map((t) => (
            <Link key={t.id} href={`/galvelica/tags/${t.id}`} className="galvelica-strip-item">
              <b>{t.name}</b>
              {typeof t.count === "number" && <i>{t.count}</i>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
