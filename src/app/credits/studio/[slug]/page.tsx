import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound, permanentRedirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { getMakerDetail, getStudioSlugByName, type MakerGameItem } from "@/lib/makers"
import { GameCard, type GameCardData } from "@/components/game-card"

import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"

import { computeDensity, DENSITY_GRID } from "@/components/archive/density"
import { roleLabel, ROLE_ROW_ORDER } from "@/lib/role-labels"

export const dynamic = "force-dynamic"

type RawSP = Record<string, string | string[] | undefined>

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const decoded = decodeURIComponent(slug)
  const detail = await getMakerDetail(decoded, 1)
  if (!detail) {
    return {
      title: "制作组未找到",
      description: "未找到该制作组。",
      robots: { index: false, follow: true },
    }
  }
  return {
    title: `制作组：${detail.name}`,
    description: `浏览 Circleica 中制作组「${detail.name}」的作品与参与创作者。`,
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

  const years = detail.games
    .map((g) => (g.releaseDate ? new Date(g.releaseDate).getFullYear() : null))
    .filter((y): y is number => y !== null)
  const yearSpan = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—"

  // 别名行：去重（并排除与规范名相同的写法）后多于一项才显示，只有一项时与组名重复
  const aliasList = Array.from(new Set(detail.aliases.map((a) => a.trim()).filter(Boolean))).filter(
    (a) => a !== detail.name,
  )

  // 统计行：某项为 0 或算不出时那一项不写，整行仍要成立（多项之间用逗号，不用中点等符号）
  const statsParts: string[] = []
  if (yearSpan !== "—") statsParts.push(yearSpan)
  if (detail.gameCount > 0) statsParts.push(`${detail.gameCount} 部作品`)
  if (detail.creators.length > 0) statsParts.push(`${detail.creators.length} 位参与创作者`)
  const statsLine = statsParts.join("，")

  // 参与创作者按职位分组：一个职位一行，同一个人兼多职时在每行都出现一次
  const explicitRoles = ROLE_ROW_ORDER.filter((r) => r !== "other")
  const crewRows = [
    ...explicitRoles.map((role) => ({
      role,
      label: roleLabel(role),
      members: detail.creators.filter((c) => c.roles.includes(role)),
    })),
    {
      role: "other" as const,
      label: "其他",
      // 其余角色（主题曲、staff、未收录的值…）全部并入这一行
      members: detail.creators.filter((c) => c.roles.some((r) => !explicitRoles.includes(r as never))),
    },
  ].filter((row) => row.members.length > 0)

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
          detailSpec
          meta={
            <div className="flex w-full flex-col gap-1">
              {aliasList.length > 1 && (
                <p className="text-xs text-muted-foreground">{aliasList.join("、")}</p>
              )}
              {statsLine && <p className="text-xs text-muted-foreground">{statsLine}</p>}
              {detail.bio && (
                <p className="mt-1 max-w-prose whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {detail.bio}
                </p>
              )}
            </div>
          }
        />
      }
    >

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
          <div className="flex flex-col gap-2">
            {crewRows.map((row) => (
              <div key={row.role} className="flex items-start gap-3">
                <span className="w-14 shrink-0 text-xs leading-5 text-muted-foreground">{row.label}</span>
                <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1">
                  {row.members.map((c) => (
                    <Link
                      key={`${row.role}-${c.id}`}
                      href={c.slug ? `/credits/creator/${encodeURIComponent(c.slug)}` : "#"}
                      className="whitespace-nowrap text-[13px] text-foreground/80 transition-colors hover:text-primary hover:underline"
                    >
                      {c.nameJa || c.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(prevHref || nextHref) && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {prevHref ? (
            <Link
              href={prevHref}
              className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition duration-150 ease-in-out hover:bg-accent hover:text-foreground"
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
              className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition duration-150 ease-in-out hover:bg-accent hover:text-foreground"
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
