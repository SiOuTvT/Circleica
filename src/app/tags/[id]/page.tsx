import { permanentRedirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * 旧入口 /tags/[id] 永久迁移到统一 slug 路由 /credits/tag/[slug]。
 * 308 保持长期语义；slug 缺失（存量未回填）时 notFound。
 */
export default async function TagDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const tag = await prisma.tag
    .findUnique({ where: { id }, select: { slug: true } })
    .catch(() => null)
  if (tag?.slug) permanentRedirect(`/credits/tag/${encodeURIComponent(tag.slug)}`)
  notFound()
}
