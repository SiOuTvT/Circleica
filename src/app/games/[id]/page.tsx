import { GameBreadcrumb } from "@/components/game-breadcrumb"
import { GameDetailClient } from "@/components/game-detail-client"
import { GameDetailTopClient } from "@/components/game-detail-top-client"
import { GameGallery } from "@/components/game-gallery"
import { auth } from "@/lib/auth"
import { parseFileSizes, parseStringArray, safeParse } from "@/lib/parse-utils"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const game = await prisma.game.findUnique({
    where: { id },
    select: { title: true, description: true, coverImage: true, originalWork: true },
  })
  if (!game) return { title: "游戏详情" }
  return {
    title: `${game.title} · 同人游戏站`,
    description: game.description?.slice(0, 160) || `${game.originalWork ? `${game.originalWork}同人游戏` : "同人游戏"} - ${game.title}`,
    openGraph: {
      title: game.title,
      description: game.description?.slice(0, 160) || "",
      images: game.coverImage ? [{ url: game.coverImage, width: 800, height: 1000 }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: game.title,
      images: game.coverImage ? [game.coverImage] : [],
    },
  }
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  const game = await prisma.game.findFirst({
    where: { id, isPublished: true },
    include: {
      tags: { select: { tag: { select: { name: true, color: true } } } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      },
      creators: {
        include: { creator: { select: { id: true, name: true, nameJa: true, avatar: true } } },
      },
    },
  })

  if (!game) notFound()

  // 增加浏览量（24小时内同一访客不重复计数）
  const cookieStore = await cookies()
  const viewedKey = `viewed_${id}`
  const alreadyViewed = cookieStore.get(viewedKey)
  if (!alreadyViewed) {
    prisma.game.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch((e) => console.warn("[viewCount]", e))
  }

  const tags = game.tags.map((t) => t.tag)
  const screenshots = safeParse<string[]>(game.screenshots, [])
  const downloadLinks = safeParse<{ label: string; url: string }[]>(game.downloadLinks, [])

  let isFav = false
  if (session?.user?.id) {
    const fav = await prisma.favorite.findUnique({
      where: { userId_gameId: { userId: session.user.id, gameId: id } },
    })
    isFav = !!fav
  }

  const platformTags = parseStringArray(game.platform)
  const languageTags = parseStringArray(game.language)
  const paramTags = [...platformTags, ...languageTags]
  const fileSizes = parseFileSizes(game.fileSize)

  const creators = game.creators.map((gc) => ({
    id: gc.creator.id,
    name: gc.creator.name,
    nameJa: gc.creator.nameJa,
    avatar: gc.creator.avatar,
    role: gc.role,
  }))

  // 取第一个创作者作为主要发布者
  const primaryCreator = creators[0]

  // 计算发布时间相对描述
  const now = new Date()
  const diffMs = now.getTime() - game.createdAt.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  let timeAgo: string
  if (diffDays === 0) timeAgo = "今天发布"
  else if (diffDays === 1) timeAgo = "昨天发布"
  else if (diffDays < 30) timeAgo = `${diffDays}天前发布`
  else if (diffDays < 365) timeAgo = `${Math.floor(diffDays / 30)}个月前发布`
  else timeAgo = `${Math.floor(diffDays / 365)}年前发布`

  // JSON-LD 结构化数据
  const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": game.title,
    "description": game.description?.slice(0, 300) || `${game.originalWork || ""} 同人游戏`,
    "image": game.coverImage || undefined,
    "url": `${BASE}/games/${id}`,
    "applicationCategory": "Game",
    "genre": tags.map(t => t.name).join(", "),
    "datePublished": game.createdAt.toISOString(),
    "dateModified": game.updatedAt.toISOString(),
    "interactionStatistic": [
      { "@type": "InteractionCounter", "interactionType": "https://schema.org/LikeAction", "userInteractionCount": game.favoriteCount },
      { "@type": "InteractionCounter", "interactionType": "https://schema.org/ViewAction", "userInteractionCount": game.viewCount },
    ],
    ...(primaryCreator ? { "author": { "@type": "Organization", "name": primaryCreator.name } } : {}),
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GameBreadcrumb gameId={id} gameTitle={game.title} />

      {/* ═══════════════════════════════════════════════
          顶部双塔区 — 左 38% + 右 62%，底边齐平 520px
      ═══════════════════════════════════════════════ */}
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 sm:px-8 lg:pt-6">
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[38%_1fr]">

          {/* ─── 左侧：单一整体大卡片 ─── */}
          <div
            className="flex flex-col"
            style={{
              height: "520px",
              borderRadius: "16px",
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            {/* ①号位：封面图 3:2，左右留内边距 */}
            <div className="px-5 pt-5 pb-2 shrink-0">
              <div
                className="relative overflow-hidden"
                style={{
                  aspectRatio: "3 / 2",
                  borderRadius: "12px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.18), 0 1px 6px rgba(0,0,0,0.08)",
                }}
              >
                {game.coverImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    {/* 底部渐变遮罩显示标题 */}
                    <div
                      className="absolute inset-x-0 bottom-0 flex items-end p-3"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)", height: "55%" }}
                    >
                      <div>
                        <h1
                          className="font-black leading-tight drop-shadow-lg"
                          style={{ fontSize: "clamp(18px, 2.5vw, 28px)", color: "#ffffff", fontWeight: 900 }}
                        >
                          {game.title}
                        </h1>
                        {game.originalWork && (
                          <p className="mt-0.5 text-[11px] text-white/70">原作：{game.originalWork}</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <span className="text-muted-foreground/40 text-sm">暂无封面</span>
                  </div>
                )}
              </div>
            </div>

            {/* ②号位：创作者/数据区，紧凑排列 */}
            <div className="flex flex-col justify-between flex-1 px-5 pb-4 pt-2 min-h-0">

              {/* 作者信息 */}
              <div className="flex items-center gap-3">
                {primaryCreator?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primaryCreator.avatar}
                    alt={primaryCreator.name}
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, var(--clr-sky), var(--clr-blue))" }}
                  >
                    {primaryCreator ? (primaryCreator.nameJa || primaryCreator.name)[0] : "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {primaryCreator ? (primaryCreator.nameJa || primaryCreator.name) : "未知创作者"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">{timeAgo}</p>
                </div>
              </div>

              {/* 标签行 */}
              {paramTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span
                    className="inline-block text-xs font-semibold"
                    style={{ color: "var(--clr-blue)" }}
                  >
                    {game.isNsfw ? "NSFW" : "SFW"}
                  </span>
                  {paramTags.slice(0, 4).map((tag, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        color: "var(--clr-blue)",
                        background: "transparent",
                        border: "1px solid rgba(128, 243, 255, 0.25)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 人气数据 */}
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span className="font-bold">{game.viewCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span className="font-bold">{game.downloadCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  <span className="font-bold">{game.favoriteCount}</span>
                </span>
              </div>

              {/* 功能按钮行 */}
              <div className="mt-auto pt-3">
                <GameDetailTopClient
                  gameId={id}
                  downloadLinks={downloadLinks}
                  isFav={isFav}
                  favCount={game.favoriteCount}
                  isLoggedIn={!!session?.user}
                />
              </div>
            </div>
          </div>

          {/* ─── 右侧巨幕与画廊（通过 GameGallery 管理联动状态）─── */}
          <GameGallery screenshots={screenshots} gameTitle={game.title} />

        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          下方内容区 — Tab 式详情
      ═══════════════════════════════════════════════ */}
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
          <GameDetailClient
            description={game.description}
            screenshots={screenshots}
            downloadLinks={downloadLinks}
            creators={creators}
            comments={game.comments.map((c) => ({
              id: c.id,
              content: c.content,
              imageUrl: c.imageUrl,
              likeCount: c.likeCount,
              createdAt: c.createdAt.toISOString(),
              user: c.user,
            }))}
            isLoggedIn={!!session?.user}
            currentUserId={session?.user?.id}
            gameId={id}
            isFav={isFav}
            favCount={game.favoriteCount}
            fileSizes={fileSizes}
            platformTags={platformTags}
            languageTags={languageTags}
            gameTags={game.tags.map((gt) => ({ name: gt.tag.name, color: gt.tag.color }))}
            viewCount={game.viewCount}
            downloadCount={game.downloadCount}
            vndbId={game.vndbId || undefined}
            releaseDate={game.releaseDate ? new Date(game.releaseDate).toLocaleDateString("zh-CN") : undefined}
            gameDuration={game.gameDuration || undefined}
            studioName={game.studioName || undefined}
          />
      </div>
    </div>
  )
}