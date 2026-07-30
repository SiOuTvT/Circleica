import { notFound, permanentRedirect } from "next/navigation"
import { getCreatorSlugById } from "@/lib/creators"

export const dynamic = "force-dynamic"

/**
 * 旧路由 /creators/[id] 兼容跳转（M2 后主站 Creator 统一走 /credits/creator/[slug]）。
 * 仅按主站 Creator.id 取 slug 后 308 跳转；VNDB 风格 id（s/p 前缀）不在主站体系内，直接 404。
 */
export default async function CreatorLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const slug = await getCreatorSlugById(id)
  if (!slug) notFound()
  permanentRedirect(`/credits/creator/${encodeURIComponent(slug)}`)
}
