import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { getTagDetail } from "@/lib/tags-browser"
import { GameCard, type GameCardData } from "@/components/game-card"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { StatsBar } from "@/components/archive/stats-bar"
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
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const detail = await getTagDetail(id)
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
    alternates: { canonical: `/tags/${id}` },
  }
}

export default async function TagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getTagDetail(id)
  if (!detail) notFound()

  const density = computeDensity(detail.gameCount)
  const groupName = detail.group?.name ?? "未分组"

  return (
    <ArchiveShell
      entity="tag"
      density={density}
      breadcrumb={
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/tags"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-foreground/80 transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            标签图鉴
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="truncate text-foreground">{detail.name}</span>
        </nav>
      }
      header={
        <ArchiveHero
          variant="tag"
          eyebrow="标签"
          title={detail.name}
          lede={detail.description ?? undefined}
          meta={
            <>
              <span>
                分组：<span className="text-foreground">{groupName}</span>
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span>
                共 <span className="tabular-nums text-foreground">{detail.gameCount}</span> 部作品
              </span>
            </>
          }
        />
      }
    >
      <StatsBar
        items={[
          { label: "作品数", value: detail.gameCount },
          { label: "分组", value: groupName },
        ]}
      />

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
