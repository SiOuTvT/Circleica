import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound, permanentRedirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMakerDetail, getStudioSlugByName, type MakerGameItem } from "@/lib/makers"
import { GameCard, type GameCardData } from "@/components/game-card"
import { Tag } from "@/components/ui/tag"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { StatsBar } from "@/components/archive/stats-bar"
import { computeDensity, DENSITY_GRID } from "@/components/archive/density"
import { ROLE_LABELS } from "@/lib/role-labels"

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
    title: `制作组：${decoded} · Circleica`,
    description: `浏览 Circleica 中制作组「${decoded}」的作品与参与创作者。`,
    alternates: { canonical: `/credits/studio/${slug}` },
  }
}

function toGameCardData(g: MakerGameItem): GameCardData {
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

export default async function MakerDetailPage({
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

  const detail = await getMakerDetail(decoded, page)
  if (!detail) {
    // 旧路由 /credits/studio/[normalizedName] 兼容：按 normalizedName 取 slug 后 308 跳转
    const legacySlug = await getStudioSlugByName(decoded)
    if (legacySlug && legacySlug !== decoded) {
      permanentRedirect(`/credits/studio/${encodeURIComponent(legacySlug)}`)
    }
    notFound()
  }

  const base = `/credits/studio/${slug}`
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
      entity="studio"
      density={density}
      breadcrumb={
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/credits/studio"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-foreground/80 transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            制作组图鉴
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="truncate text-foreground">{detail.name}</span>
        </nav>
      }
      header={
        <ArchiveHero
          variant="org"
          eyebrow="Studio"
          title={detail.name}
          cover={detail.coverImage}
          fallbackInitial={detail.name}
          meta={
            <>
              <span>
                共 <span className="tabular-nums text-foreground">{detail.gameCount}</span> 部作品
              </span>
              {detail.creators.length > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span>
                    <span className="tabular-nums text-foreground">{detail.creators.length}</span> 位参与创作者
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
          { label: "作品数", value: detail.gameCount },
          { label: "参与创作者", value: detail.creators.length },
          { label: "收藏总数", value: totalFav.toLocaleString() },
          { label: "活动年份", value: yearSpan },
        ]}
      />

      <section>
        <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
          <span className="h-5 w-1 rounded-full bg-primary" />
          作品
        </h2>
        {detail.games.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">该制作组暂无已收录的作品</p>
        ) : (
          <div className={cn(GAME_GRID_CLASS, DENSITY_GRID[density])}>
            {detail.games.map((g) => (
              <GameCard key={g.id} game={toGameCardData(g)} />
            ))}
          </div>
        )}
      </section>

      {detail.creators.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
            <span className="h-5 w-1 rounded-full bg-primary" />
            参与创作者
          </h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {detail.creators.map((c) => (
              <Link
                key={c.slug ?? c.id}
                href={c.slug ? `/credits/creator/${encodeURIComponent(c.slug)}` : "#"}
                className="group flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-sm"
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/50">
                  {c.avatar ? (
                    <Image
                      src={c.avatar}
                      alt={c.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized
                      sizes="44px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
                      <span className="text-sm font-bold text-primary/40">{(c.nameJa || c.name).slice(0, 1)}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                    {c.nameJa || c.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {c.roles.slice(0, 3).map((r) => (
                      <Tag key={r} className="px-1.5 py-0 text-[10px] leading-4">
                        {ROLE_LABELS[r] || r}
                      </Tag>
                    ))}
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
