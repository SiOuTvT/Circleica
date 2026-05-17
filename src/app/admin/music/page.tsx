import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import dynamic from "next/dynamic"

const MusicManager = dynamic(() => import("@/components/music-manager").then(m => ({ default: m.MusicManager })), {
  loading: () => <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>,
})

export const metadata = { title: "音乐管理 · 管理后台" }

export default async function AdminMusicPage() {
  await requireAdmin()
  const music = await prisma.music.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
  return (
    <div className="w-full space-y-4">
      <h1 className="text-lg font-bold text-foreground">音乐管理</h1>
      <MusicManager initialMusic={music} />
    </div>
  )
}
