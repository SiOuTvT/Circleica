import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCreatorDetail, type CreatorGameItem } from "@/lib/creators"
import { GameCard, type GameCardData } from "@/components/game-card"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { StatsBar } from "@/components/archive/stats-bar"
import { computeDensity, DENSITY_GRID } from "@/components/archive/density"

export const dynamic = "force-dynamic"

type RawSP = Record<string, string | string[] | undefined>

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  return {
    title: `创作者：${decoded} · Circleica`,
    description: `浏览 Circleica 中创作者「${decoded}」的参与作品、所属制作组与职位。`,
    alternates: { canonical: `/credits/creator/${slug}` },
  }
}

function toGameCardData(g: CreatorGameItem): GameCardData {
  return {
    id: g.id,
    serialId: g.serialId,
    title: g.title,
    coverImage: g.coverImage || "",
    tags: [],
    favoriteCount: g.favoriteCount,
    isNsfw: false,
    status: "",
  }
}

const GAME_GRID_CLASS = "grid gap-3"

/**
 * Creator 详情页（M2，/credits/creator/[slug]）。
 * 镜像 Studio 详情（ArchiveShell + ArchiveHero(person,cover) + StatsBar + GameCard 网格 + 所属制作组 + 上下页），
 * 数据全部来自主站本地 getCreatorDetail，不接副站/VNDB/Random。
 */
export default async function CreatorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<RawSP>
}) {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page) || "1", 10) || 1)
  const decoded = decodeURIComponent(slug)

  const detail = await getCreatorDetail(decoded, page)
  if (!detail) notFound()

  const base = `/credits/creator/${slug}`
  const prevHref = detail.page > 1 ? `${base}?page=${detail.page - 1}` : null
  const nextHref = detail.page < detail.totalPages ? `${base}?page=${detail.page + 1}` : null

  const totalFav = detail.games.reduce((s, g) => s + (g.favoriteCount || 0), 0)
  const years = detail.games
    .map((g) => (g.releaseDate ? new Date(g.releaseDate).getFullYear() : null))
    .filter((y): y is number => y !== null)
  const yearSpan = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—"

  const density = computeDensity(detail.gameCount)

  return (
    <ArchiveShell
      entity="creator"
      density={density}
      breadcrumb={
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/credits/creator"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-foreground/80 transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            创作者图鉴
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="truncate text-foreground">{detail.nameJa || detail.name}</span>
        </nav>
      }
      header={
        <ArchiveHero
          variant="person"
          eyebrow="Creator"
          title={detail.nameJa || detail.name}
          cover={detail.avatar}
          fallbackInitial={detail.name}
          meta={
            <>
              <span>
                共 <span className="tabular-nums text-foreground">{detail.gameCount}</span> 部参与作品
              </span>
              {detail.roles.length > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span>
                    <span className="tabular-nums text-foreground">{detail.roles.length}</span> 类职位
                  </span>
                </>
              )}
            </>
          }
        />
      }
    >
      <StatsBar
        items={[
          { label: "参与作品", value: detail.gameCount },
          { label: "所属制作组", value: detail.studios.length },
          { label: "职位种类", value: detail.roles.length },
          { label: "收藏总数", value: totalFav.toLocaleString() },
        ]}
      />

      {detail.bio && (
        <section>
          <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
            <span className="h-5 w-1 rounded-full bg-primary" />
            简介
          </h2>
          <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {detail.bio}
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
          <span className="h-5 w-1 rounded-full bg-primary" />
          参与作品
        </h2>
        {detail.games.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">该创作者暂无已收录的参与作品</p>
        ) : (
          <div className={cn(GAME_GRID_CLASS, DENSITY_GRID[density])}>
            {detail.games.map((g) => (
              <GameCard key={g.id} game={toGameCardData(g)} />
            ))}
          </div>
        )}
      </section>

      {detail.studios.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
            <span className="h-5 w-1 rounded-full bg-primary" />
            所属制作组
          </h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {detail.studios.map((s) => (
              <Link
                key={s.slug ?? s.name}
                href={s.slug ? `/credits/studio/${encodeURIComponent(s.slug)}` : "#"}
                className="group flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {s.name}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="tabular-nums text-foreground/80">{s.gameCount}</span>
                    <span>部作品</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(prevHref || nextHref) && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {prevHref ? (
            <Link
              href={prevHref}
              className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground"
            >
              上一页
            </Link>
          ) : (
            <span className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground/30 ring-1 ring-border/50">上一页</span>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <span className="tabular-nums text-foreground/90">{detail.page}</span>
            <span>/</span>
            <span className="tabular-nums">{detail.totalPages}</span>
          </div>
          {nextHref ? (
            <Link
              href={nextHref}
              className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground"
            >
              下一页
            </Link>
          ) : (
            <span className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground/30 ring-1 ring-border/50">下一页</span>
          )}
        </div>
      )}
    </ArchiveShell>
  )
}
