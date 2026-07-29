import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCreatorDetail, type CreatorGameItem } from "@/lib/creators"
import { GameCard, type GameCardData } from "@/components/game-card"
import { Tag } from "@/components/ui/tag"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { StatsBar } from "@/components/archive/stats-bar"
import { computeDensity, DENSITY_GRID } from "@/components/archive/density"
import { roleLabel } from "@/lib/role-labels"

export const dynamic = "force-dynamic"

type RawSP = Record<string, string | string[] | undefined>

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return {
    title: `创作者 · Circleica`,
    description: `浏览 Circleica 中创作者的参与作品、所属制作组与角色。`,
    alternates: { canonical: `/creators/${id}` },
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

export default async function CreatorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<RawSP>
}) {
  const { id } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page) || "1", 10) || 1)

  const detail = await getCreatorDetail(id, page)
  if (!detail) notFound()

  const base = `/creators/${id}`
  const prevHref = detail.page > 1 ? `${base}?page=${detail.page - 1}` : null
  const nextHref = detail.page < detail.totalPages ? `${base}?page=${detail.page + 1}` : null

  const years = detail.games
    .map((g) => (g.releaseDate ? new Date(g.releaseDate).getFullYear() : null))
    .filter((y): y is number => y !== null)
  const yearSpan = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—"
  const genderLabel = detail.gender === "m" ? "男性" : detail.gender === "f" ? "女性" : ""

  const density = computeDensity(detail.gameCount)
  const displayName = detail.nameJa || detail.name

  return (
    <ArchiveShell
      entity="creator"
      density={density}
      breadcrumb={
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/creators"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-foreground/80 transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            创作者图鉴
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="truncate text-foreground">{displayName}</span>
        </nav>
      }
      header={
        <ArchiveHero
          variant="person"
          eyebrow="Creator"
          title={displayName}
          cover={detail.avatar}
          fallbackInitial={detail.name}
          lede={detail.bio || undefined}
          meta={
            <>
              <span>
                共 <span className="tabular-nums text-foreground">{detail.gameCount}</span> 部作品
              </span>
              {genderLabel && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{genderLabel}</span>
                </>
              )}
              {detail.vndbId && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <a
                    href={`https://vndb.org/s${detail.vndbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/80 hover:text-primary"
                  >
                    VNDB · s{detail.vndbId}
                  </a>
                </>
              )}
            </>
          }
        />
      }
    >
      <StatsBar
        items={[
          { label: "作品数", value: detail.gameCount },
          { label: "角色种类", value: detail.roles.length },
          { label: "所属制作组", value: detail.studios.length },
          { label: "活动年份", value: yearSpan },
        ]}
      />

      {detail.roles.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2.5 text-base font-semibold text-foreground">
            <span className="h-5 w-1 rounded-full bg-primary" />
            参与角色
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {detail.roles.map((r) => (
              <Tag key={r} className="px-2 py-0.5 text-xs">
                {roleLabel(r)}
              </Tag>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
          <span className="h-5 w-1 rounded-full bg-primary" />
          参与作品
        </h2>
        {detail.games.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">该创作者暂无已收录的作品</p>
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
          <div className="flex flex-wrap gap-2">
            {detail.studios.map((s) => (
              <Link
                key={s.normalized}
                href={`/credits/studio/${encodeURIComponent(s.normalized)}`}
                className="inline-flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-sm"
              >
                <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                  {s.name}
                </span>
                <span className="tabular-nums text-xs text-muted-foreground">{s.gameCount} 部</span>
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
