import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import dynamic from "next/dynamic"

const AnnouncementsManager = dynamic(() => import("@/components/announcements-manager").then(m => ({ default: m.AnnouncementsManager })), {
  loading: () => <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>,
})

export const metadata = { title: "公告管理 · 管理后台" }

export default async function AdminAnnouncementsPage() {
  await requireAdmin()
  const anns = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
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
    <div className="w-full space-y-4">
      <h1 className="text-lg font-bold text-foreground">公告管理</h1>
      <AnnouncementsManager initialAnns={initial} />
    </div>
  )
}
