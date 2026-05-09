import { AnnounceSwiper } from "@/components/announce-swiper"
import { GameCardSkeleton } from "@/components/game-card"
import { GameGridClient } from "@/components/game-grid-client"
import { buildGameSearchFilter } from "@/lib/filters"
import { prisma } from "@/lib/prisma"
import { Suspense } from "react"

function GameGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
    const sampleTitles = ["星之梦", "Clannad", "Fate/stay night", "Rewrite", "Little Busters!", "Angel Beats!", "Kanon", "Air"]
    const sampleDescs = [
      "Key社经典催泪作品，讲述了一个机器人与少女在末日废墟中的短暂相遇与离别的故事。",
      "以家族与爱情为主题的长篇视觉小说，描绘了冈崎朋也与古河渚之间感人至深的人生旅程。",
      "TYPE-MOON的传奇之作，围绕圣杯战争展开的壮阔奇幻冒险，拥有多个令人难忘的故事线。",
      "Key社又一力作，以「Rewrite」为主题，讲述了的的少年在超自然力量与日常之间的抉择。",
      "以友情与青春为主题的群像剧，直枝理树与Little Busters的伙伴们共同经历的欢笑与泪水。",
      "死后世界的少年少女们组成SSS战团反抗命运的感人故事，融合了战斗、喜剧与催泪元素。",
      "Key社催泪三部曲之一，月宫亚由与相的祐一在雪之小镇重逢的冬日恋爱物语。",
      "Key社催泪三部曲之二，国崎往人与神尾观铃之间跨越千年的翼人传说。",
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
      coverImage: "",
      description: sampleDescs[i],
      tags: sampleTags[i],
      favoriteCount: 0,
      viewCount: 0,
      isNsfw: false,
      status: "",
      createdAt: "",
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
    <div className="flex flex-col gap-3 sm:gap-5">

      {/* Hero Section：响应式布局 */}
      {/* 桌面端：左侧按钮 + 右侧公告（对齐用户头像右侧）；手机端：公告在上，按钮在下横排 */}
      <div className="flex flex-col lg:grid lg:grid-cols-[auto_1fr] gap-3 sm:gap-6 lg:gap-4 items-start">
        
        {/* 左侧功能区（手机端显示在下面）*/}
        {/* 右侧公告区（手机端显示在最上面）*/}
        {announcements.length > 0 && (
          <div className="lg:col-span-1 order-1 lg:order-2 w-full">
            <AnnounceSwiper announcements={announcements} />
          </div>
        )}
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
