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
        creators: { select: { creatorId: true, role: true, creator: { select: { vndbId: true, name: true, nameJa: true } } } },
      },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.tagGroup.findMany({
      orderBy: { name: "asc" },
      include: { tags: { orderBy: { name: "asc" } } },
    }),
  ])

  if (!game) notFound()

  let screenshots: string[] = []
  let downloadLinks: { url: string; label: string }[] = []
  try { screenshots = JSON.parse(game.screenshots || "[]") } catch { /* ignore */ }
  try { downloadLinks = JSON.parse(game.downloadLinks || "[]") } catch { /* ignore */ }

  const gameData = {
    ...game,
    screenshots,
    downloadLinks,
    tagIds: game.tags.map((t) => t.tag.id),
    creators: game.creators.map((c) => ({ vndbId: c.creator.vndbId, name: c.creator.name, nameJa: c.creator.nameJa, role: c.role })),
    releaseDate: game.releaseDate ? game.releaseDate.toISOString().slice(0, 10) : undefined,
  }

  return (
    <div className="w-full space-y-6">
      <h1 className="text-xl font-bold text-foreground">编辑游戏</h1>
      <GameForm tags={tags} tagGroups={tagGroups} initialData={gameData} gameId={id} />
      <GameLogManager gameId={id} />
    </div>
  )
}
