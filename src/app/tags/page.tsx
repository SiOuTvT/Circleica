import { Suspense } from "react"
import { getTagBrowserData } from "@/lib/tags-browser"
import { TagCloud } from "@/components/tags/tag-cloud"
import { TagCategory } from "@/components/tags/tag-category"
import { TagIndex } from "@/components/tags/tag-index"
import { Skeleton } from "@/components/ui/skeleton"
import { Tag } from "lucide-react"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "标签浏览",
  description: "按标签浏览游戏，发现你感兴趣的作品类型",
  openGraph: { title: "标签浏览 · Circleica", description: "按标签浏览游戏，发现你感兴趣的作品类型", images: ["/opengraph-image"] },
  alternates: { canonical: "/tags" },
}

export const revalidate = 300 // 5 分钟缓存

/**
 * 标签浏览页面
 * 提供标签云、分类浏览、全部索引三种浏览方式
 */
export default async function TagsPage() {
  const data = await getTagBrowserData()

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Tag className="h-6 w-6" strokeWidth={2} /> 标签浏览
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          通过标签发现游戏，共 {data.stats.totalTags} 个标签，{data.stats.totalGames} 部游戏
        </p>
      </div>

      {/* 热门标签云 */}
      <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
        <TagCloud tags={data.hotTags} />
      </Suspense>

      {/* 分类浏览 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          📂 按分类浏览
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.tagGroups.map((group) => (
            <TagCategory key={group.id} group={group} />
          ))}
        </div>
      </section>

      {/* 全部标签索引 */}
      <section>
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
          <TagIndex tagsByLetter={data.tagsByLetter} />
        </Suspense>
      </section>
    </div>
  )
}