import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { WorkGrid } from "@/components/galvelica/work-card"
import { Pager } from "@/components/galvelica/pager"
import { getTagById, listWorks } from "@/lib/galvelica"

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

  const [tag, result] = await Promise.all([getTagById(tagId), listWorks({ tags: [tagId], page })])
  if (!tag) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/galvelica/tags" className="galvelica-navlink inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium">
          ← 全部标签
        </Link>
        <h1 className="galvelica-serif mt-3 text-2xl font-semibold text-foreground">
          标签：{tag.name}
          {tag.groupName && <span className="ml-2 text-base font-normal text-muted-foreground">（{tag.groupName}）</span>}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {result.total} 部作品
        </p>
      </div>

      <WorkGrid works={result.items} priorityCount={5} />
      <Pager basePath={`/galvelica/tags/${tagId}`} page={result.page} totalPages={result.totalPages} />
    </div>
  )
}
