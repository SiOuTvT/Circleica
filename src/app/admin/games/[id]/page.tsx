import { GameForm } from "@/components/game-form"
import { GameLogManager } from "@/components/game-log-manager"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export const metadata = { title: "编辑游戏 · 管理后台" }

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const [game, tags, creators] = await Promise.all([
    prisma.game.findUnique({
      where: { id },
      include: {
        tags: { select: { tag: true } },
        creators: { select: { creatorId: true, role: true } },
      },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.creator.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, nameJa: true, avatar: true } }),
  ])

  if (!game) notFound()

  const gameData = {
    ...game,
    screenshots: JSON.parse(game.screenshots || "[]"),
    downloadLinks: JSON.parse(game.downloadLinks || "[]"),
    tagIds: game.tags.map((t) => t.tag.id),
    gameCreators: game.creators.map(c => ({ creatorId: c.creatorId, role: c.role })),
  }

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-lg font-bold text-foreground">编辑游戏</h1>
      <GameForm tags={tags} creators={creators} initialData={gameData} gameId={id} />
      <GameLogManager gameId={id} />
    </div>
  )
}
