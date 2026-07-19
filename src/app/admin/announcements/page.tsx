import { requireAdmin } from "@/lib/admin"
import { announcementService } from "@/services/announcement"
import dynamic from "next/dynamic"

const AnnouncementsManager = dynamic(() => import("@/components/announcements-manager").then(m => ({ default: m.AnnouncementsManager })), {
  loading: () => <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>,
})

export const metadata = { title: "公告管理 · 管理后台" }

export default async function AdminAnnouncementsPage() {
  await requireAdmin()
  const anns = await announcementService.getAll()

  const initial = anns.map(a => ({
    id: a.id,
    title: a.title,
    summary: a.summary ?? "",
    content: a.content,
    imageUrl: a.imageUrl ?? "",
    link: a.link ?? "",
    status: a.status ?? "published",
    isPinned: a.isPinned ?? false,
    isActive: a.isActive,
    sortOrder: a.sortOrder,
    startAt: a.startAt?.toISOString() ?? null,
    endAt: a.endAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }))

  return (
    <div className="w-full space-y-6">
      <h1 className="text-xl font-bold text-foreground">公告管理</h1>
      <AnnouncementsManager initialAnns={initial} />
    </div>
  )
}
