import { GameCard, GameCardSkeleton } from "@/components/game-card"
import { SearchBar } from "@/components/search-bar"
import { prisma } from "@/lib/prisma"
import { ArrowUpDown, Clock, Heart, TrendingUp } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

type SortKey = "newest" | "popular" | "mostFaved"

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Clock }[] = [
  { key: "newest",    label: "最新",   icon: Clock },
  { key: "popular",  label: "最热",   icon: TrendingUp },
  { key: "mostFaved",label: "最多收藏", icon: Heart },
]

const ORDER_MAP: Record<SortKey, object> = {
  newest:    { createdAt: "desc" },
  popular:   { viewCount: "desc" },
  mostFaved: { favoriteCount: "desc" },
}

async function SearchResults({
  q, tag, sort, nsfw,
}: {
  q: string; tag: string; sort: SortKey; nsfw: boolean
}) {
  const where = {
    isPublished: true,
    ...(nsfw ? {} : { isNsfw: false }),
    ...(q && {
      OR: [
        { title:        { contains: q, mode: "insensitive" as const } },
        { originalWork: { contains: q, mode: "insensitive" as const } },
        { description:  { contains: q, mode: "insensitive" as const } },
        { tags: { some: { tag: { name: { contains: q, mode: "insensitive" as const } } } } },
      ],
    }),
    ...(tag && { tags: { some: { tag: { name: tag } } } }),
  }

  const games = await prisma.game.findMany({
    where,
    orderBy: ORDER_MAP[sort],
    take: 60,
      select: {
      id: true, title: true, coverImage: true, status: true,
      isNsfw: true, favoriteCount: true, viewCount: true,
      downloadCount: true, platform: true, language: true, fileSize: true,
      updatedAt: true, createdAt: true,
      tags: { select: { tag: { select: { name: true, color: true } } } },
    },
  })

  if (!games.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-zinc-500">
          {q ? `没有找到与「${q}」相关的游戏` : "没有符合条件的游戏"}
        </p>
        {q && (
          <Link href="/search" className="mt-3 inline-block text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            清除搜索条件
          </Link>
        )}
      </div>
    )
  }

  return (
    <>
      <p className="mb-4 text-xs text-zinc-600">找到 {games.length} 个结果</p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 items-stretch">
        {games.map((game) => (
          <GameCard key={game.id} game={{ ...game, tags: game.tags.map((t: any) => t.tag) }} />
        ))}
      </div>
    </>
  )
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 items-stretch">
      {Array.from({ length: 12 }).map((_, i) => <GameCardSkeleton key={i} />)}
    </div>
  )
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string; nsfw?: string }>
}) {
  const sp    = await searchParams
  const q     = sp.q?.trim() ?? ""
  const tag   = sp.tag?.trim() ?? ""
  const sort  = (sp.sort as SortKey) ?? "newest"
  const nsfw  = sp.nsfw === "1"

  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } })

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    if (q)    p.set("q",    q)
    if (tag)  p.set("tag",  tag)
    if (sort !== "newest") p.set("sort", sort)
    if (nsfw) p.set("nsfw", "1")
    Object.entries(overrides).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    const s = p.toString()
    return `/search${s ? `?${s}` : ""}`
  }

  return (
    <div className="space-y-5">
      {/* 搜索框 */}
      <SearchBar defaultValue={q} />

      {/* 标签云 */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildHref({ tag: "" })}
          className={[
            "rounded-full px-3 py-1 text-xs font-medium transition-all",
            !tag
              ? "bg-zinc-700 text-zinc-100 ring-1 ring-zinc-600"
              : "bg-zinc-900 light:bg-zinc-100 text-zinc-500 ring-1 ring-white/[0.06] light:ring-black/[0.06] hover:bg-zinc-800 light:hover:bg-zinc-200 hover:text-zinc-300 light:hover:text-zinc-700",
          ].join(" ")}
        >
          全部
        </Link>
        {tags.map((t) => (
          <Link
            key={t.id}
            href={buildHref({ tag: t.name })}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium transition-all ring-1",
              tag === t.name ? "opacity-100" : "opacity-50 hover:opacity-80",
            ].join(" ")}
            style={
              tag === t.name
                ? { color: t.color, background: `${t.color}20`, outlineColor: t.color }
                : { color: t.color, background: `${t.color}10`, borderColor: `${t.color}30` }
            }
          >
            {t.name}
          </Link>
        ))}
      </div>

      {/* 排序 + 结果标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">
          {q && tag
            ? `「${q}」· ${tag}`
            : q
            ? `「${q}」的搜索结果`
            : tag
            ? `# ${tag}`
            : "全部游戏"}
        </h2>

        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.5} />
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={buildHref({ sort: key })}
              className={[
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                sort === key
                  ? "bg-zinc-800 text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-400",
              ].join(" ")}
            >
              <Icon className="h-3 w-3" strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* 结果网格 */}
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchResults q={q} tag={tag} sort={sort} nsfw={nsfw} />
      </Suspense>
    </div>
  )
}
