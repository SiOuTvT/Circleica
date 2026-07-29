import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Users } from "lucide-react"
import { getMakerDetail, type MakerGameItem } from "@/lib/makers"
import { GameCard, type GameCardData } from "@/components/game-card"
import { Tag } from "@/components/ui/tag"

export const dynamic = "force-dynamic"

type RawSP = Record<string, string | string[] | undefined>

const ROLE_LABELS: Record<string, string> = {
  scenario: "脚本",
  art: "原画",
  chardesign: "角色设计",
  music: "音乐",
  songs: "主题曲",
  director: "导演",
  other: "其他",
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>
}): Promise<Metadata> {
  const { name } = await params
  const decoded = decodeURIComponent(name)
  return {
    title: `制作组：${decoded} · Circleica`,
    description: `浏览 Circleica 中制作组「${decoded}」的作品与参与创作者。`,
    alternates: { canonical: `/credits/studio/${name}` },
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

export default async function MakerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>
  searchParams: Promise<RawSP>
}) {
  const { name } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page) || "1", 10) || 1)
  const decoded = decodeURIComponent(name)

  const detail = await getMakerDetail(decoded, page)
  if (!detail) notFound()

  const base = `/credits/studio/${name}`
  const prevHref = detail.page > 1 ? `${base}?page=${detail.page - 1}` : null
  const nextHref = detail.page < detail.totalPages ? `${base}?page=${detail.page + 1}` : null

  return (
    <div className="space-y-8">
      {/* 面包屑 */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/credits" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-foreground/80 transition-colors hover:text-primary">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          制作组图鉴
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="truncate text-foreground">{detail.name}</span>
      </nav>

      {/* 制作组头 */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border/60 sm:h-32 sm:w-32">
          {detail.coverImage ? (
            <Image src={detail.coverImage} alt={detail.name} fill className="object-cover" unoptimized sizes="128px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
              <span className="text-3xl font-bold text-primary/30">{detail.name.slice(0, 1)}</span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">{detail.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            共 <span className="tabular-nums text-foreground">{detail.gameCount}</span> 部作品
            {detail.creators.length > 0 && (
              <>
                <span className="mx-2 text-muted-foreground/30">·</span>
                <span className="tabular-nums text-foreground">{detail.creators.length}</span> 位参与创作者
              </>
            )}
          </p>
        </div>
      </header>

      {/* 作品区 */}
      <section>
        <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
          <span className="h-5 w-1 rounded-full bg-primary" />
          作品
        </h2>
        {detail.games.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">该制作组暂无已收录的作品</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {detail.games.map((g) => (
              <GameCard key={g.id} game={toGameCardData(g)} />
            ))}
          </div>
        )}
      </section>

      {/* 参与创作者关联区 */}
      {detail.creators.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-foreground">
            <span className="h-5 w-1 rounded-full bg-primary" />
            参与创作者
          </h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {detail.creators.map((c) => (
              <Link
                key={c.id}
                href={`/creators/${c.id}`}
                className="group flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-sm"
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/50">
                  {c.avatar ? (
                    <Image src={c.avatar} alt={c.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized sizes="44px" />
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

      {/* 分页 */}
      {(prevHref || nextHref) && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {prevHref ? (
            <Link href={prevHref} className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground">
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
            <Link href={nextHref} className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground">
              下一页
            </Link>
          ) : (
            <span className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground/30 ring-1 ring-border/50">下一页</span>
          )}
        </div>
      )}
    </div>
  )
}
