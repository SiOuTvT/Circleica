import { AnnounceSwiper } from "@/components/announce-swiper"
import { GameCardSkeleton } from "@/components/game-card"
import { GameGridClient } from "@/components/game-grid-client"
import { RandomCharacterBtn, RandomCreatorBtn } from "@/components/random-game-btn"
import { buildGameSearchFilter } from "@/lib/filters"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Suspense } from "react"

function GameGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
        id: true, title: true, coverImage: true, status: true,
        isNsfw: true, favoriteCount: true, viewCount: true, createdAt: true,
        description: true,
        tags: { select: { tag: { select: { name: true, color: true } } } },
      },
    }),
    prisma.game.count({ where }),
  ])

  if (!games.length) {
    return <div className="py-20 text-center text-sm text-muted-foreground">暂无游戏资源，管理员快去添加吧~</div>
  }

  const mapped = games.map((g: any) => ({ ...g, tags: g.tags.map((t: any) => t.tag) }))

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

  const [tags, total, announcements] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.game.count({ where: { isPublished: true, ...(nsfw ? {} : { isNsfw: false }) } }),
    prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, content: true, imageUrl: true, link: true },
    }),
  ])

  const allTags = ["全部", ...tags.map((t: { name: string }) => t.name)]

  return (
    <div className="flex flex-col gap-5">

      {/* Hero Section：响应式布局 */}
      {/* 桌面端：左侧按钮 + 右侧公告（对齐用户头像右侧）；手机端：公告在上，按钮在下横排 */}
      <div className="flex flex-col lg:grid lg:grid-cols-[auto_1fr] gap-6 lg:gap-4 items-start">
        
        {/* 左侧功能区（手机端显示在下面）*/}
        <div className="order-2 lg:order-1 flex flex-col justify-end min-h-[auto] lg:min-h-[220px]">
          {/* 横向排列两个功能按钮（手机端），桌面端纵向 */}
          <div className="flex flex-row lg:flex-col gap-3 w-fit">
            {/* 随机人物按钮 */}
            <RandomCreatorBtn />
            
            {/* 随机角色按钮 */}
            <RandomCharacterBtn />
          </div>
        </div>

        {/* 右侧公告区（手机端显示在最上面）*/}
        <div className="lg:col-span-1 order-1 lg:order-2 w-full">
          <div className="rounded-2xl bg-card/60 backdrop-blur-sm ring-1 ring-border relative overflow-hidden"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            {/* 顶部高光边 */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent z-10" />
            
            {announcements.length > 0
              ? <AnnounceSwiper announcements={announcements} />
              : <div className="h-full min-h-[180px] sm:min-h-[200px] lg:min-h-[220px] w-full animate-pulse rounded-2xl bg-muted" />
            }
          </div>
        </div>
      </div>

      {/* 标签筛选 */}
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => (
          <Link
            key={tag}
            href={`/?tag=${encodeURIComponent(tag)}${q ? `&q=${encodeURIComponent(q)}` : ""}${nsfw ? "&nsfw=1" : ""}`}
            className={[
              "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
              activeTag === tag
                ? "bg-accent text-foreground ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
            ].join(" ")}
          >
            {tag}
          </Link>
        ))}
      </div>

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
