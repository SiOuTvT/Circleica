import Link from "next/link"
import { notFound } from "next/navigation"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma, Prisma } from "@/lib/prisma"
import { AdminPageContainer } from "@/components/admin-page-container"
import { Tag as TagIcon, ArrowLeft } from "lucide-react"
import { TagDetailClient } from "./tag-detail-client"

export const metadata = { title: "Galvelica 标签详情 · 管理后台" }
export const dynamic = "force-dynamic"

export default async function GalvelicaTagDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireSiteAdmin("galvelica")
  const { id } = await params

  const tag = await prisma.tag.findFirst({
    where: { id, source: "galvelica" },
    select: { id: true, name: true, color: true, description: true, slug: true },
  })
  if (!tag) notFound()

  // 关联作品数（用原始 SQL 与列表页一致）
  let workCount = 0
  try {
    const rows = await prisma.$queryRaw<Array<{ _count: number }>>`
      SELECT COUNT(*)::int as "_count" FROM "WorkTag" WHERE "tagId" = ${id}
    `
    workCount = rows[0]?._count ?? 0
  } catch {
    workCount = 0
  }

  const related = await prisma.workTag.findMany({
    where: { tagId: id },
    take: 50,
    orderBy: { work: { updatedAt: "desc" } },
    select: { work: { select: { id: true, title: true, slug: true } } },
  })

  // 可选合并目标（同名近似或同色，排除自身）
  const candidates = await prisma.tag.findMany({
    where: { source: "galvelica", NOT: { id } },
    orderBy: { name: "asc" },
    take: 100,
    select: { id: true, name: true, color: true },
  })

  return (
    <AdminPageContainer
      eyebrow="GALVELICA · TAG"
      title={tag.name}
      description={tag.description || "Galvelica 副站标签"}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/galvelica/tags"
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition-all hover:ring-foreground/10 hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回
          </Link>
          <TagDetailClient
            tag={{ id: tag.id, name: tag.name, color: tag.color, description: tag.description }}
            candidates={candidates}
          />
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5">
            <span
              className="inline-block h-12 w-12 rounded-full ring-1 ring-border"
              style={{ background: tag.color }}
            />
            <p className="text-lg font-semibold text-foreground">{tag.name}</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {workCount} 部作品
            </span>
            {tag.description && <p className="text-center text-sm text-muted-foreground">{tag.description}</p>}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <TagIcon className="h-4 w-4 text-primary" /> 关联作品（{workCount}）
            </h3>
            {related.length === 0 ? (
              <p className="text-sm text-muted-foreground">该标签暂无关联作品。</p>
            ) : (
              <ul className="divide-y divide-border">
                {related.map((r) => (
                  <li key={r.work.id} className="py-2.5">
                    <Link href={`/galvelica/works/${r.work.slug}`} className="font-medium text-foreground hover:text-primary hover:underline">
                      {r.work.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AdminPageContainer>
  )
}
