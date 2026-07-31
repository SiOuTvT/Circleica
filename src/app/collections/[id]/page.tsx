import { notFound, permanentRedirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

/**
 * 旧 /collections/[id] 入口兼容跳转（M3 后精选合集统一在 /credits/collection/[slug]）。
 * 按 id 查出 slug 后永久跳转到新 slug 路由；slug 缺失（未迁移旧数据）则 404。
 */
export const dynamic = "force-dynamic"

export default async function CollectionsDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const collection = await prisma.curatedCollection
    .findUnique({ where: { id }, select: { slug: true } })
    .catch(() => null)

  if (collection?.slug) {
    permanentRedirect(`/credits/collection/${encodeURIComponent(collection.slug)}`)
  }
  notFound()
}
