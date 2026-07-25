import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getWorkBySlug } from "@/lib/galvelica"
import { WorkDetailView } from "@/components/galvelica/work-detail"

export const dynamic = "force-dynamic"

/**
 * 未收录作品的资料页（Stage E / F）。
 * 路由按 slug 解析 Work；已收录作品请走 /galvelica/works/<serialId>（见同名目录）。
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const work = await getWorkBySlug(slug)
  if (!work) return { title: "作品档案 · Galvelica" }
  return {
    title: `${work.title} · Galvelica 资料库`,
    description: work.description?.replace(/<[^>]+>/g, "").slice(0, 160) || `${work.originalWork ? work.originalWork + " · " : ""}${work.title} 的同人视觉小说资料`,
    alternates: { canonical: work.href },
  }
}

export default async function GalvelicaWorkBySlug({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const work = await getWorkBySlug(slug)
  if (!work) notFound()

  return <WorkDetailView work={work} />
}
