import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { toShanghaiDate } from "@/lib/date"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
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
    prisma.tag.findMany({ where: { source: "circleica" }, orderBy: { name: "asc" } }),
    prisma.tagGroup.findMany({
      orderBy: { name: "asc" },
      include: { tags: { orderBy: { name: "asc" } } },
    }),
  ])

  if (!game) notFound()

  // Json 字段需显式解析为对应 TS 类型，避免 Prisma JsonValue 与组件 prop 类型不匹配
  const screenshots: string[] = Array.isArray(game.screenshots) ? game.screenshots as string[] : []
  const platforms: string[] = Array.isArray(game.platforms) ? (game.platforms as unknown[]).filter((x) => typeof x === "string") : []
  const languages: string[] = Array.isArray(game.languages) ? (game.languages as unknown[]).filter((x) => typeof x === "string") : []
  const downloadLinks: { url: string; label: string }[] = Array.isArray(game.downloadLinks) ? game.downloadLinks as { url: string; label: string }[] : []

  const gameData = {
    ...game,
    screenshots,
    platforms,
    languages,
    downloadLinks,
    originalLanguage: typeof game.originalLanguage === "string" ? game.originalLanguage : "",
    ageRating: typeof game.ageRating === "string" ? game.ageRating : "",
    status: game.status,
    tagIds: game.tags.map((t) => t.tag.id),
    creators: game.creators.map((c) => ({ vndbId: c.creator.vndbId, name: c.creator.name, nameJa: c.creator.nameJa, role: c.role })),
    releaseDate: game.releaseDate ? toShanghaiDate(game.releaseDate) : undefined,
  }

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader eyebrow="EDIT GAME" title="编辑游戏" />
      <GameForm tags={tags} tagGroups={tagGroups} initialData={gameData} gameId={id} />
      <GameLogManager gameId={id} />
    </div>
  )
}
