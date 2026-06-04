import { requireAdmin } from "@/lib/admin"
import { Pagination } from "@/components/ui/pagination"
import { prisma } from "@/lib/prisma"
import dynamic from "next/dynamic"

const AnnouncementsManager = dynamic(() => import("@/components/announcements-manager").then(m => ({ default: m.AnnouncementsManager })), {
  loading: () => <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>,
})

export const metadata = { title: "公告管理 · 管理后台" }

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [anns, total] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { sortOrder: "asc" }, skip, take: limit }),
    prisma.announcement.count(),
  ])

  const initial = anns.map(a => ({
    id: a.id,
    title: a.title,
    content: a.content,
    imageUrl: a.imageUrl ?? "",
    link: a.link ?? "",
    isActive: a.isActive,
    sortOrder: a.sortOrder,
    createdAt: a.createdAt.toISOString(),
  }))

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="w-full space-y-6">
      <h1 className="text-xl font-bold text-foreground">公告管理</h1>
      <AnnouncementsManager initialAnns={initial} />
      <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/announcements" />
    </div>
  )
}
