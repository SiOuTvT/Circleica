import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { WorkGrid } from "@/components/galvelica/work-card"
import { Pager } from "@/components/galvelica/pager"
import { GalvelicaBackLink } from "@/components/galvelica/back-link"
import { getTagById, listWorks } from "@/lib/galvelica"
import { getGalvelicaTagColor } from "@/lib/site-settings"

export const dynamic = "force-dynamic"

type RawSP = Record<string, string | string[] | undefined>

export async function generateMetadata({ params }: { params: Promise<{ tagId: string }> }): Promise<Metadata> {
  const { tagId } = await params
  const tag = await getTagById(tagId)
  if (!tag) return { title: "标签 · Galvelica" }
  return {
    title: `标签：${tag.name} · Galvelica`,
    description: `浏览 Galvelica 中标签为「${tag.name}」的同人视觉小说作品${tag.count ? `，共 ${tag.count} 部` : ""}。`,
    alternates: { canonical: `/galvelica/tags/${tagId}` },
  }
}

export default async function GalvelicaTagDetail({
  params,
  searchParams,
}: {
  params: Promise<{ tagId: string }>
  searchParams: Promise<RawSP>
}) {
  const { tagId } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page) || "1", 10) || 1)

  const [tag, result, tagColor] = await Promise.all([getTagById(tagId), listWorks({ tags: [tagId], page }), getGalvelicaTagColor()])
  if (!tag) notFound()

  return (
    <div className="space-y-8">
      <div>
        <GalvelicaBackLink href="/galvelica/tags" label="标签索引" />
        <h1 className="galvelica-h1 mt-3">
          标签：{tag.name}
          {tag.groupName && <span className="ml-2 text-base font-normal text-muted-foreground">（{tag.groupName}）</span>}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {result.total} 部作品
        </p>
      </div>

      <WorkGrid works={result.items} priorityCount={5} tagColor={tagColor} />
      <Pager basePath={`/galvelica/tags/${tagId}`} page={result.page} totalPages={result.totalPages} />
    </div>
  )
}
