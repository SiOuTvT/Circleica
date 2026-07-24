import type { Metadata } from "next"
import { TagCloud } from "@/components/galvelica/tag-pill"
import { getPopularTags } from "@/lib/galvelica"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "标签浏览 · Galvelica",
  description: "沿题材、世界观、剧情类型、游戏系统、社团、作者、角色属性、CP、年份与平台等维度探索同人视觉小说。",
  alternates: { canonical: "/galvelica/tags" },
}

export default async function GalvelicaTags() {
  const tags = await getPopularTags(80)

  // 按分组归类（无分组的归入「其他」）
  const groups = new Map<string, typeof tags>()
  for (const t of tags) {
    const g = t.groupName || "其他"
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(t)
  }
  const ordered = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "zh-Hans-CN"))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="galvelica-serif text-2xl font-semibold text-foreground">标签浏览</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {tags.length} 个标签。沿题材、世界观、社团、作者、角色属性、CP、年份与平台自由探索。
        </p>
      </div>

      {ordered.map(([group, list]) => (
        <section key={group}>
          <h2 className="galvelica-serif mb-3 text-lg font-semibold text-foreground">{group}</h2>
          <TagCloud tags={list} />
        </section>
      ))}
    </div>
  )
}
