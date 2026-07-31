import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cn } from "@/lib/utils"
import { getTagDetailBySlug } from "@/lib/tags-browser"
import { GameCard, type GameCardData } from "@/components/game-card"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"
import { computeDensity, DENSITY_GRID } from "@/components/archive/density"
import type { TagGameItem } from "@/types/tags-browser"

export const revalidate = 300

function toGameCardData(g: TagGameItem): GameCardData {
  return {
    id: g.id,
    serialId: g.serialId,
    title: g.title,
    coverImage: g.coverImage || "",
    tags: [],
    favoriteCount: g.favoriteCount,
    viewCount: g.viewCount ?? undefined,
    downloadCount: g.downloadCount ?? undefined,
    isNsfw: g.isNsfw,
    status: g.status,
  }
}

const GAME_GRID_CLASS = "grid gap-3"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const detail = await getTagDetailBySlug(slug)
  if (!detail) {
    return {
      title: "标签未找到 · Circleica",
      description: "未找到该标签。",
      robots: { index: false, follow: true },
    }
  }
  const desc = detail.description
    ? `${detail.description} 共 ${detail.gameCount} 部作品。`
    : `浏览标签「${detail.name}」下的 ${detail.gameCount} 部作品。`
  return {
    title: `标签：${detail.name} · Circleica`,
    description: desc,
    alternates: { canonical: `/credits/tag/${slug}` },
  }
}

export default async function TagDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const detail = await getTagDetailBySlug(slug)
  if (!detail) notFound()

  const density = computeDensity(detail.gameCount)

  return (
    <ArchiveShell
      entity="tag"
      density={density}
      header={
        <ArchiveHero
          variant="tag"
          eyebrow="标签"
          title={detail.name}
          lede={detail.description ?? undefined}
        />
      }
    >
      <section>
        <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
          <span className="h-5 w-1 rounded-full bg-primary" />
          作品
        </h2>
        {detail.games.length === 0 ? (
          <ArchivePlaceholder state="empty" entity="tag" message="该标签暂无已收录的作品" />
        ) : (
          <>
            <div className={cn(GAME_GRID_CLASS, DENSITY_GRID[density])}>
              {detail.games.map((g) => (
                <GameCard key={g.id} game={toGameCardData(g)} />
              ))}
            </div>
            {detail.hasMore && (
              <p className="mt-4 text-center text-xs text-muted-foreground/70">
                仅展示前 {detail.games.length} 部作品，完整列表与筛选请在搜索中查看。
              </p>
            )}
          </>
        )}
      </section>
    </ArchiveShell>
  )
}
