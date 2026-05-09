import { AnnouncementsManager } from "@/components/announcements-manager"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "公告管理 · 管理后台" }

export default async function AdminAnnouncementsPage() {
  await requireAdmin()
  const anns = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } })
  const initial = anns.map(a => ({
    id: a.id,
    title: a.title,
    content: a.content,
    imageUrl: a.imageUrl ?? "",
    link: a.link ?? "",
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
  }))

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-bold text-foreground">公告管理</h1>
      <AnnouncementsManager initialAnns={initial} />
    </div>
  )
}
