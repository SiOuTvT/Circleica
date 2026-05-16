import { MusicManager } from "@/components/music-manager"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "音乐管理 · 管理后台" }

export default async function AdminMusicPage() {
  await requireAdmin()
  const music = await prisma.music.findMany({ orderBy: { createdAt: "desc" } })
  return (
    <div className="w-full space-y-4">
      <h1 className="text-lg font-bold text-foreground">音乐管理</h1>
      <MusicManager initialMusic={music} />
    </div>
  )
}
