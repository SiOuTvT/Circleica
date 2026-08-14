import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { unstable_cache } from "next/cache"
import { cache as reactCache } from "react"
import { getWorkBySerialId, getWorkBySlug } from "@/lib/galvelica"
import { getGalvelicaTagColor } from "@/lib/site-settings"
import { WorkDetailView } from "@/components/galvelica/work-detail"

/**
 * 作品详情路由（Stage E / F 统一入口）。
 * URL 段可能是：
 *   - 数字 serialId → 已收录作品（解析 Game → Work）
 *   - slug          → 未收录作品（直接按 slug 解析 Work）
 * 两者都渲染同一份 WorkDetailView。
 */
// React cache：在同一请求的 generateMetadata 与页面渲染间去重，
// 避免详情页对 resolveWork 的重复 DB 查询（保留 Date 等对象类型，不序列化）。
const resolveWorkBase = reactCache(async (segment: string) => {
  if (/^\d+$/.test(segment)) return getWorkBySerialId(parseInt(segment, 10))
  return getWorkBySlug(segment)
})

// A-9（方案 A）：主体数据走 Data Cache + cache tag，写路径通过 revalidateTag 失效。
// 该页无 per-request 个性化（WorkDetailView 不依赖 session/cookies），可整页缓存。
const resolveWork = (segment: string) =>
  unstable_cache(() => resolveWorkBase(segment), ["work-detail", segment], {
    revalidate: 1800,
    tags: ["work-detail", `work:${segment}`],
  })()

export async function generateMetadata({
  params,
}: {
  params: Promise<{ serialId: string }>
}): Promise<Metadata> {
  const { serialId } = await params
  const work = await resolveWork(serialId)
  if (!work) return { title: "作品 · Galvelica" }
  return {
    title: `${work.title} · Galvelica 资料库`,
    description: work.description?.replace(/<[^>]+>/g, "").slice(0, 160) || `${work.originalWork ? work.originalWork + " · " : ""}${work.title} 的同人视觉小说资料`,
    alternates: { canonical: work.href },
  }
}

export default async function GalvelicaWorkDetail({
  params,
}: {
  params: Promise<{ serialId: string }>
}) {
  const { serialId } = await params
  const [work, tagColor] = await Promise.all([resolveWork(serialId), getGalvelicaTagColor()])
  if (!work) notFound()

  return <WorkDetailView work={work} tagColor={tagColor} />
}
