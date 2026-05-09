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
    // 展示示例占位卡片（带图片和信息）
    const sampleTitles = ["星之梦", "Clannad", "Fate/stay night", "Rewrite", "Little Busters!", "Angel Beats!", "Kanon", "Air"]
    const sampleCovers = [
      "https://picsum.photos/seed/game1/400/480",
      "https://picsum.photos/seed/game2/400/480",
      "https://picsum.photos/seed/game3/400/480",
      "https://picsum.photos/seed/game4/400/480",
      "https://picsum.photos/seed/game5/400/480",
      "https://picsum.photos/seed/game6/400/480",
      "https://picsum.photos/seed/game7/400/480",
      "https://picsum.photos/seed/game8/400/480",
    ]
    const sampleTags = [
      [{ name: "催泪", color: "#FF8FAB" }, { name: "治愈", color: "#FFB3C6" }],
      [{ name: "校园", color: "#FF8FAB" }, { name: "恋爱", color: "#FFB3C6" }],
      [{ name: "奇幻", color: "#FF8FAB" }, { name: "战斗", color: "#FFB3C6" }],
      [{ name: "催泪", color: "#FF8FAB" }, { name: "校园", color: "#FFB3C6" }],
      [{ name: "日常", color: "#FF8FAB" }, { name: "友情", color: "#FFB3C6" }],
      [{ name: "催泪", color: "#FF8FAB" }, { name: "奇幻", color: "#FFB3C6" }],
      [{ name: "恋爱", color: "#FF8FAB" }, { name: "催泪", color: "#FFB3C6" }],
      [{ name: "治愈", color: "#FF8FAB" }, { name: "奇幻", color: "#FFB3C6" }],
    ]
    const placeholderGames = Array.from({ length: 8 }).map((_, i) => ({
      id: `placeholder-${i}`,
      title: sampleTitles[i],
      coverImage: sampleCovers[i],
      description: "这是一款精彩的同人游戏作品",
      tags: sampleTags[i],
      favoriteCount: Math.floor(Math.random() * 200) + 10,
      viewCount: Math.floor(Math.random() * 2000) + 100,
      isNsfw: false,
      status: i % 3 === 0 ? "完结" : "连载中",
      createdAt: new Date().toISOString(),
    }))
    return <GameGridClient initialGames={placeholderGames} total={0} tag={tag} q={q} nsfw={nsfw} />
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
        {announcements.length > 0 && (
          <div className="lg:col-span-1 order-1 lg:order-2 w-full">
            <AnnounceSwiper announcements={announcements} />
          </div>
        )}
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
