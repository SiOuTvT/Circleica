import { requireAdmin } from "@/lib/admin"
import { Pagination } from "@/components/ui/pagination"
import { prisma } from "@/lib/prisma"
import dynamic from "next/dynamic"

const MusicManager = dynamic(() => import("@/components/music-manager").then(m => ({ default: m.MusicManager })), {
  loading: () => <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>,
})

export const metadata = { title: "音乐管理 · 管理后台" }

export default async function AdminMusicPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [music, total] = await Promise.all([
    prisma.music.findMany({ orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.music.count(),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="w-full space-y-6">
      <h1 className="text-xl font-bold text-foreground">音乐管理</h1>
      <MusicManager initialMusic={music} />
      <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/music" />
    </div>
  )
}
