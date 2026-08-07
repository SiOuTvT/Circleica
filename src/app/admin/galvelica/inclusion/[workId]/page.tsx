import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { toShanghaiDate } from "@/lib/date"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import NextDynamic from "next/dynamic"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

const GameForm = NextDynamic(() => import("@/components/game-form").then(m => ({ default: m.GameForm })), {
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-muted" />,
})

export const metadata = { title: "收录审核 · 补全与编辑 · 管理后台" }

/**
 * 收录审核的「编辑/补全」界面：与主站「新增游戏/编辑游戏」页面结构完全一致。
 * 复用 GameForm（编辑模式 + initialData 预填草稿已有数据，含 VNDB 信息），
 * 管理员可手动拉取 VNDB 一键补全缺失字段，保存(PUT)后回到审核列表，再「发布至主站」。
 */
export default async function InclusionEditPage({ params }: { params: Promise<{ workId: string }> }) {
  await requireSiteAdmin("galvelica")
  const { workId } = await params

  const [work, tags, tagGroups] = await Promise.all([
    prisma.work.findUnique({
      where: { id: workId },
      include: {
        game: {
          include: {
            tags: { select: { tag: true } },
            creators: { select: { creatorId: true, role: true, creator: { select: { vndbId: true, name: true, nameJa: true } } } },
          },
        },
      },
    }),
    prisma.tag.findMany({ where: { source: "circleica" }, orderBy: { name: "asc" } }),
    prisma.tagGroup.findMany({
      orderBy: { name: "asc" },
      include: { tags: { orderBy: { name: "asc" } } },
    }),
  ])

  if (!work || !work.game) notFound()

  const game = work.game

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
      <AdminPageHeader eyebrow="GALVELICA · INCLUSION EDIT" title="收录补全与编辑" />
      <p className="rounded-xl bg-violet-500/10 px-4 py-3 text-sm text-violet-700 ring-1 ring-violet-500/20 dark:text-violet-300">
        此界面与主站「新增游戏」结构一致。可点「VNDB 数据拉取」一键补全缺失字段（所有字段均可手动修改）。
        补全后两种发布方式：勾选底部「立即发布」保存即发布至主站；或保存草稿后回到审核列表点「发布」。
      </p>
      <GameForm
        tags={tags}
        tagGroups={tagGroups}
        gameId={game.id}
        initialData={gameData}
        redirectTo="/admin/galvelica/inclusion"
      />
    </div>
  )
}
