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
    // 展示占位卡片预览
    const placeholderGames = [
      { id: "demo-1", title: "东方Project · 绯想天", coverImage: "", description: "经典弹幕射击同人游戏，体验华丽的弹幕艺术", tags: [{ name: "弹幕", color: "#f472b6" }, { name: "东方", color: "#a78bfa" }], favoriteCount: 128, viewCount: 2048, isNsfw: false, status: "完结", createdAt: new Date().toISOString() },
      { id: "demo-2", title: "月姬 -A piece of blue glass moon-", coverImage: "", description: "TYPE-MOON经典视觉小说重制版", tags: [{ name: "视觉小说", color: "#60a5fa" }, { name: "剧情", color: "#34d399" }], favoriteCount: 256, viewCount: 4096, isNsfw: false, status: "完结", createdAt: new Date().toISOString() },
      { id: "demo-3", title: "寒蝉鸣泣之时", coverImage: "", description: "悬疑推理同人游戏，揭开雏见泽的真相", tags: [{ name: "悬疑", color: "#f87171" }, { name: "推理", color: "#fbbf24" }], favoriteCount: 89, viewCount: 1536, isNsfw: false, status: "完结", createdAt: new Date().toISOString() },
      { id: "demo-4", title: "Fate/stay night REMASTERED", coverImage: "", description: "命运之夜，圣杯战争的开幕", tags: [{ name: "视觉小说", color: "#60a5fa" }, { name: "战斗", color: "#fb923c" }], favoriteCount: 512, viewCount: 8192, isNsfw: false, status: "完结", createdAt: new Date().toISOString() },
      { id: "demo-5", title: "海猫鸣泣之时", coverImage: "", description: "寒蝉续作，魔女与推理的对决", tags: [{ name: "悬疑", color: "#f87171" }, { name: "推理", color: "#fbbf24" }], favoriteCount: 67, viewCount: 1024, isNsfw: false, status: "完结", createdAt: new Date().toISOString() },
      { id: "demo-6", title: "UNDERTALE 同人 · 黄色命运", coverImage: "", description: "UNDERTALE粉丝自制冒险RPG", tags: [{ name: "RPG", color: "#4ade80" }, { name: "冒险", color: "#38bdf8" }], favoriteCount: 203, viewCount: 3200, isNsfw: false, status: "连载中", createdAt: new Date().toISOString() },
      { id: "demo-7", title: "东方地灵殿 · 精灵幻想", coverImage: "", description: "探索地底世界的弹幕冒险", tags: [{ name: "弹幕", color: "#f472b6" }, { name: "东方", color: "#a78bfa" }], favoriteCount: 95, viewCount: 1800, isNsfw: false, status: "完结", createdAt: new Date().toISOString() },
      { id: "demo-8", title: "尸体派对 · 同人续作", coverImage: "", description: "恐怖冒险同人游戏，天神小学的诅咒", tags: [{ name: "恐怖", color: "#ef4444" }, { name: "冒险", color: "#38bdf8" }], favoriteCount: 45, viewCount: 890, isNsfw: false, status: "完结", createdAt: new Date().toISOString() },
    ]
    return <GameGridClient initialGames={placeholderGames} total={placeholderGames.length} tag={tag} q={q} nsfw={nsfw} />
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
