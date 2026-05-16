import { GameForm } from "@/components/game-form"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "新增游戏 · 管理后台" }

export default async function NewGamePage() {
  await requireAdmin()
  const [tags, creators] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.creator.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, nameJa: true, avatar: true } }),
  ])
  return (
    <div className="w-full">
      <h1 className="mb-6 text-lg font-bold text-foreground">新增游戏</h1>
      <GameForm tags={tags} />
    </div>
  )
}
