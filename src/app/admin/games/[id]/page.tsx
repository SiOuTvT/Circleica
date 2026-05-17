import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import dynamic from "next/dynamic"
import { notFound } from "next/navigation"

const GameForm = dynamic(() => import("@/components/game-form").then(m => ({ default: m.GameForm })), {
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" />,
})

const GameLogManager = dynamic(() => import("@/components/game-log-manager").then(m => ({ default: m.GameLogManager })), {
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-muted" />,
})

export const metadata = { title: "编辑游戏 · 管理后台" }

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const [game, tags, tagGroups] = await Promise.all([
    prisma.game.findUnique({
      where: { id },
      include: {
        tags: { select: { tag: true } },
      },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.tagGroup.findMany({
      orderBy: { name: "asc" },
      include: { tags: { orderBy: { name: "asc" } } },
    }),
  ])

  if (!game) notFound()

  const gameData = {
    ...game,
    screenshots: JSON.parse(game.screenshots || "[]"),
    downloadLinks: JSON.parse(game.downloadLinks || "[]"),
    tagIds: game.tags.map((t) => t.tag.id),
    releaseDate: game.releaseDate ? game.releaseDate.toISOString().slice(0, 10) : undefined,
  }

  return (
    <div className="w-full space-y-5">
      <h1 className="text-lg font-bold text-foreground">编辑游戏</h1>
      <GameForm tags={tags} tagGroups={tagGroups} initialData={gameData} gameId={id} />
      <GameLogManager gameId={id} />
    </div>
  )
}
