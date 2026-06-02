import { AnnounceSwiper } from "@/components/announce-swiper"
import { GameCard, GameCardSkeleton } from "@/components/game-card"
import { GameGridClient } from "@/components/game-grid-client"
import { RandomCharacterBtn, RandomCreatorBtn } from "@/components/random-discover-btns"
import { buildGameSearchFilter } from "@/lib/filters"
import { prisma } from "@/lib/prisma"
import { getSiteSetting } from "@/lib/site-settings"
import { TrendingUp } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

function GameGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
      {Array.from({ length: 12 }).map((_, i) => <GameCardSkeleton key={i} />)}
    </div>
  )
}

async function GameGridServer({ tag, q, nsfw }: { tag: string; q: string; nsfw: boolean }) {
  const where = buildGameSearchFilter({ q, tag, nsfw })

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true, serialId: true, title: true, coverImage: true, status: true,
        isNsfw: true, favoriteCount: true, viewCount: true,
        downloadCount: true,
        downloadLinks: true,
        updatedAt: true, createdAt: true,
        tags: { select: { tag: { select: { name: true, color: true } } } },
        resources: { select: { language: true, runType: true, resourceContent: true } },
      },
    }),
    prisma.game.count({ where }),
  ])

  if (!games.length) {
    return <GameGridClient initialGames={[]} total={0} tag={tag} q={q} nsfw={nsfw} />
  }

  const placeholder = await getSiteSetting("default_placeholder_image")
  const mapped = games.map((g) => {
    // downloadLinks 是 JSON 字符串，需要解析为对象数组
    let downloadLinks: { label?: string; url: string; platform?: string }[] = []
    try {
      const parsed = JSON.parse(g.downloadLinks || "[]")
      if (Array.isArray(parsed)) {
        downloadLinks = parsed
      }
    } catch { /* ignore */ }
    // 从资源中收集去重的 resourceTags
    const resourceTags: string[] = [...new Set(
      g.resources.flatMap((r) => {
        const items: string[] = []
        try { items.push(...JSON.parse(r.language)) } catch {}
        try { items.push(...JSON.parse(r.runType)) } catch {}
        try { items.push(...JSON.parse(r.resourceContent)) } catch {}
        return items
      })
    )]

    return {
      ...g,
      coverImage: g.coverImage || placeholder,
      tags: g.tags.map((t) => t.tag),
      downloadLinks,
      resourceTags,
    }
  })

  return <GameGridClient initialGames={mapped} total={total} tag={tag} q={q} nsfw={nsfw} />
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; nsfw?: string }>
}) {
  const sp        = await searchParams
  const q         = sp.q?.trim() || ""
  const activeTag = sp.tag || "全部"
  const nsfw      = sp.nsfw === "1"

  const [tags, total, announcements, hotGames] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.game.count({ where: { isPublished: true, ...(nsfw ? {} : { isNsfw: false }) } }),
    prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, content: true, imageUrl: true, link: true },
    }),
    prisma.game.findMany({
      where: { isPublished: true, isNsfw: false, favoriteCount: { gt: 0 } },
      orderBy: { favoriteCount: "desc" },
      take: 8,
      select: {
        id: true, serialId: true, title: true, coverImage: true, status: true,
        isNsfw: true, favoriteCount: true, viewCount: true,
        downloadCount: true, downloadLinks: true,
        updatedAt: true, createdAt: true,
        tags: { select: { tag: { select: { name: true, color: true } } } },
        resources: { select: { language: true, runType: true, resourceContent: true } },
      },
    }),
  ])

  const placeholder = await getSiteSetting("default_placeholder_image")

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <h1 className="sr-only">同人游戏站 · 资源大厅</h1>

      {/* Hero Section：响应式布局 */}
      {/* 桌面端：左侧按钮 + 右侧公告（对齐用户头像右侧）；手机端：公告在上，按钮在下横排 */}
      <div className="flex flex-col lg:grid lg:grid-cols-[auto_1fr] gap-3 sm:gap-6 lg:gap-4 items-start">
        
        {/* 左侧功能区（手机端显示在下面）*/}
        <div className="order-2 lg:order-1 flex flex-row lg:flex-col gap-2 lg:gap-3 w-full lg:w-auto">
          <RandomCreatorBtn />
          <RandomCharacterBtn />
        </div>
        {/* 右侧公告区（手机端显示在最上面）*/}
        {announcements.length > 0 && (
          <div className="lg:col-span-1 order-1 lg:order-2 w-full">
            <AnnounceSwiper announcements={announcements} />
          </div>
        )}
      </div>

      {/* 热门游戏 */}
      {hotGames.length > 0 && !q && activeTag === "全部" && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2} />
            <h2 className="text-base font-semibold text-foreground">热门推荐</h2>
            <Link href="/search?sort=mostFaved" className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
              查看更多 →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-4 lg:grid-cols-4 items-stretch">
            {hotGames.map((g) => {
              let downloadLinks: { label?: string; url: string }[] = []
              try { downloadLinks = JSON.parse(g.downloadLinks || "[]") } catch {}
              const resourceTags: string[] = [...new Set(
                g.resources.flatMap((r) => {
                  const items: string[] = []
                  try { items.push(...JSON.parse(r.language)) } catch {}
                  try { items.push(...JSON.parse(r.runType)) } catch {}
                  try { items.push(...JSON.parse(r.resourceContent)) } catch {}
                  return items
                })
              )]
              return (
                <GameCard
                  key={g.id}
                  game={{ ...g, coverImage: g.coverImage || placeholder, tags: g.tags.map(t => t.tag), downloadLinks, resourceTags }}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* 游戏网格 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-wide text-foreground">
            {q ? `「${q}」的搜索结果` : activeTag === "全部" ? "最新资源" : `# ${activeTag}`}
          </h2>
          <span className="text-sm text-muted-foreground">{total} 个</span>
        </div>
        <Suspense fallback={<GameGridSkeleton />}>
          <GameGridServer tag={activeTag} q={q} nsfw={nsfw} />
        </Suspense>
      </section>

    </div>
  )
}
