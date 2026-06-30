import { GameBreadcrumb } from "@/components/game-breadcrumb"
import GameDetailClient from "@/components/game-detail-client"
import { GameDetailTopClient } from "@/components/game-detail-top-client"
import { GameGallery } from "@/components/game-gallery"
import { RelatedGames } from "@/components/related-games"
import { SafeImage } from "@/components/safe-image"
import { ViewCounter } from "@/components/view-counter"
import { FeedbackBtn } from "@/components/feedback-btn"
import { auth } from "@/lib/auth"
import { getAllDescriptions, getDescriptionText } from "@/lib/parse-description"
import { safeParse } from "@/lib/parse-utils"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { isNumericId } from "@/lib/serial-id"
import { Tag, TagGroup } from "@/components/ui/tag"
import { Download, Eye, Heart } from "lucide-react"
import Image from "next/image"
import { notFound, redirect } from "next/navigation"
import { cache as reactCache } from "react"

/**
 * 游戏详情页 — 支持两种 URL 格式：
 *   /games/1         (serialId，新格式)
 *   /games/clxxx     (cuid，旧格式 → 301 重定向到 serialId URL)
 */

// ── 查找游戏：优先 serialId，回退 cuid（React cache 去重，generateMetadata 和页面共享） ──
const resolveGame = reactCache(async function resolveGame(id: string) {
  if (isNumericId(id)) {
    const numId = parseInt(id, 10)
    if (isNaN(numId) || numId <= 0) return null
    return prisma.game.findUnique({ where: { serialId: numId }, select: { id: true, serialId: true } })
  }
  return prisma.game.findUnique({ where: { id }, select: { id: true, serialId: true } })
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resolved = await resolveGame(id)
  const game = resolved ? await prisma.game.findUnique({
    where: { id: resolved.id },
    select: { title: true, description: true, coverImage: true, originalWork: true },
  }) : null
  if (!game) return { title: "游戏详情" }
  return {
    title: `${game.title} · 同人游戏站`,
    description: getDescriptionText(game.description)?.slice(0, 160) || `${game.originalWork ? `${game.originalWork}同人游戏` : "同人游戏"} - ${game.title}`,
    openGraph: {
      title: game.title,
      description: getDescriptionText(game.description)?.slice(0, 160) || "",
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

  // auth 和 resolveGame 无依赖，并行执行
  const [session, resolved] = await Promise.all([auth(), resolveGame(id)])
  if (!resolved) notFound()

  // 如果是 cuid 格式访问 → 301 重定向到 serialId URL
  if (!isNumericId(id)) {
    redirect(`/games/${resolved.serialId}`)
  }

  // 查询游戏详情（评论只加载前 20 条，其余通过 API 分页加载）
  const game = await prisma.game.findFirst({
    where: { id: resolved.id, isPublished: true },
    include: {
      tags: { select: { tag: { select: { id: true, name: true, color: true, group: { select: { color: true, name: true } } } } } },
      resources: { select: { language: true, runType: true, resourceContent: true } },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { id: true, username: true, avatar: true } } },
      },
      creators: {
        include: { creator: { select: { id: true, name: true, nameJa: true, avatar: true } } },
      },
      publisher: { select: { id: true, username: true, avatar: true } },
    },
  })

  if (!game) notFound()

  const tags = game.tags.map((t) => t.tag)
  const tagNames = tags.map((t) => t.name)

  // 获取"资源标签"组颜色 + 收藏状态，并行执行
  const [resourceTagColor, isFav] = await Promise.all([
    (async () => {
      try {
        const cacheKeyResource = cacheKey("tagGroup", "resource", "color")
        const cachedColor = await cache.get<string>(cacheKeyResource)
        if (cachedColor) return cachedColor
        const group = await prisma.tagGroup.findFirst({
          where: { id: "preset_resource_tab" },
          select: { color: true },
        })
        if (group?.color) {
          await cache.set(cacheKeyResource, group.color, 3600)
          return group.color
        }
      } catch {}
      return "#22c55e"
    })(),
    session?.user?.id
      ? prisma.favorite.findUnique({
          where: { userId_gameId: { userId: session.user.id, gameId: resolved.id } },
        }).then(f => !!f)
      : Promise.resolve(false),
  ])

  // 从所有资源中收集去重的 resourceTags（语言、运行方式、资源内容）
  const resourceTags: string[] = [...new Set(
    game.resources.flatMap((r) => {
      const items: string[] = []
      const lang = Array.isArray(r.language) ? r.language as string[] : []
      const run = Array.isArray(r.runType) ? r.runType as string[] : []
      const content = Array.isArray(r.resourceContent) ? r.resourceContent as string[] : []
      items.push(...lang, ...run, ...content)
      return items
    })
  )]

  // 相关游戏推荐：按共同标签匹配 - 使用缓存
  const relatedCacheKey = cacheKey("related", resolved.id, tagNames.sort().join(","))
  let relatedGames: { id: string; serialId: number; title: string; coverImage: string; originalWork: string }[]

  if (tagNames.length === 0) {
    relatedGames = []
  } else {
    const cachedRelated = await cache.get<typeof relatedGames>(relatedCacheKey)
    if (cachedRelated) {
      relatedGames = cachedRelated
    } else {
      relatedGames = await prisma.game.findMany({
        where: {
          id: { not: resolved.id },
          isPublished: true,
          tags: { some: { tag: { name: { in: tagNames } } } },
        },
        select: { id: true, serialId: true, title: true, coverImage: true, originalWork: true },
        orderBy: { favoriteCount: "desc" },
        take: 8,
      })
      await cache.set(relatedCacheKey, relatedGames, 1800) // 缓存 30 分钟
    }
  }
  const screenshots = safeParse<string[]>(game.screenshots, [])
  const downloadLinks = safeParse<{ label: string; url: string }[]>(game.downloadLinks, [])

  const creators = game.creators.map((gc) => ({
    id: gc.creator.id,
    name: gc.creator.name,
    nameJa: gc.creator.nameJa,
    avatar: gc.creator.avatar,
    role: gc.role,
  }))

  // 计算发布时间相对描述
  const createdAt = new Date(game.createdAt)
  const now = new Date()
  const diffMs = now.getTime() - createdAt.getTime()
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
    "description": getDescriptionText(game.description)?.slice(0, 300) || `${game.originalWork || ""} 同人游戏`,
    "image": game.coverImage || undefined,
    "url": `${BASE}/games/${game.serialId}`,
    "applicationCategory": "Game",
    "genre": tags.map(t => t.name).join(", "),
    "datePublished": new Date(game.createdAt).toISOString(),
    "dateModified": new Date(game.updatedAt).toISOString(),
    "interactionStatistic": [
      { "@type": "InteractionCounter", "interactionType": "https://schema.org/LikeAction", "userInteractionCount": game.favoriteCount },
      { "@type": "InteractionCounter", "interactionType": "https://schema.org/ViewAction", "userInteractionCount": game.viewCount },
    ],
    ...(game.publisher ? { "author": { "@type": "Person", "name": game.publisher.username } } : {}),
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/<\/script>/g, '\\u003c\\u002fscript\\u003e') }}
      />
      <ViewCounter gameId={resolved.id} />
      <GameBreadcrumb gameId={String(game.serialId)} gameTitle={game.title} />

      {/* ═══════════════════════════════════════════════
          顶部双塔区 — 左 38% + 右 62%，底边齐平 520px
      ═══════════════════════════════════════════════ */}
      <div className="pt-2 sm:pt-4 lg:pt-6 overflow-hidden min-w-0">
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[38%_1fr] min-w-0">

          {/* ─── 左侧：单一整体大卡片 ─── */}
          <div
            className="flex flex-col min-w-0 rounded-2xl bg-card border border-border overflow-hidden"
            style={{ boxShadow: "var(--card-shadow)" }}
          >
            {/* ①号位：封面图 16:9，融入卡片顶部 */}
            <div className="shrink-0 min-w-0">
              <div
                className="relative overflow-hidden w-full aspect-[5/3] sm:aspect-[16/9] rounded-t-2xl"
              >
                {game.coverImage ? (
                  <SafeImage
                    src={game.coverImage}
                    alt={game.title}
                    fill
                    className="object-cover"
                    draggable={false}
                    sizes="(max-width: 1024px) 100vw, 38vw"
                    priority
                    quality={80}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <span className="text-muted-foreground/40 text-sm">封面还没上传~</span>
                  </div>
                )}
              </div>
            </div>

            {/* ②号位：标题 → 标签 → 发布者+按钮 → 数据 */}
            <div className="flex flex-col flex-1 px-2.5 sm:px-5 pb-3 sm:pb-5 pt-2 sm:pt-3 min-h-0 min-w-0">

              {/* ① 游戏标题 */}
              <div className="mb-1 sm:mb-1.5">
                <h1 className="font-bold leading-tight text-foreground text-xl sm:text-2xl lg:text-[28px]">
                  {game.title}
                </h1>
                {game.originalWork && (
                  <p className="mt-0.5 sm:mt-1 text-xs text-muted-foreground/60">原作：{game.originalWork}</p>
                )}
              </div>

              {/* ② 标签行 */}
              <TagGroup className="mt-1.5 sm:mt-2 mb-2 sm:mb-3">
                {/* SFW/NSFW 标识 */}
                <Tag color={game.isNsfw ? "#d87070" : undefined} className={game.isNsfw ? "" : "bg-blue-500/10 text-blue-500 border-blue-500/20"}>
                  {game.isNsfw ? "NSFW" : "SFW"}
                </Tag>
                {/* 资源标签（语言/运行方式/资源内容，来自 GameResource）— 颜色跟随主题色 */}
                {resourceTags.map((tag) => (
                  <Tag key={tag} className="game-card-tag max-w-[96px] truncate" title={tag}>
                    {tag}
                  </Tag>
                ))}
              </TagGroup>

              {/* ③ 发布者信息 + 功能按钮 */}
              <div className="flex items-center gap-2.5 sm:gap-3 mt-auto">
                {game.publisher?.avatar ? (
                  <Image
                    src={game.publisher.avatar}
                    alt={game.publisher.username}
                    width={48}
                    height={48}
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full text-sm sm:text-base font-bold text-white"
                    style={{ background: "linear-gradient(135deg, var(--clr-sky), var(--clr-blue))" }}
                  >
                    {game.publisher ? game.publisher.username[0] : "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[15px] sm:text-base lg:text-lg font-medium sm:font-semibold text-foreground/80 sm:text-foreground truncate">
                    {game.publisher ? game.publisher.username : "本站发布"}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground/50 sm:text-muted-foreground/70">{timeAgo}</p>
                </div>
                <div className="ml-auto shrink-0">
                  <GameDetailTopClient
                    gameId={resolved.id}
                    downloadLinks={downloadLinks}
                    isFav={isFav}
                    isLoggedIn={!!session}
                    compact
                    scrollToResources
                  />
                </div>
              </div>

              {/* ④ 人气数据 */}
              <div className="flex items-center gap-4 sm:gap-5 pt-3 sm:pt-4 mt-2 sm:mt-3 border-t border-border/40">
                <span className="flex items-center gap-1.5 text-sm sm:text-[15px] lg:text-base text-muted-foreground">
                  <Eye className="w-4 h-4" />
                  <span className="font-bold tabular-nums">{game.viewCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm sm:text-[15px] lg:text-base text-muted-foreground">
                  <Download className="w-4 h-4" />
                  <span className="font-bold tabular-nums">{game.downloadCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm sm:text-[15px] lg:text-base text-muted-foreground">
                  <Heart className="w-4 h-4" />
                  <span className="font-bold tabular-nums">{game.favoriteCount}</span>
                </span>
                <FeedbackBtn gameId={resolved.id} isLoggedIn={!!session} />
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
      <div className="pt-3 pb-6 sm:py-8 lg:py-12">
          <GameDetailClient
            description={getDescriptionText(game.description)}
            allDescriptions={getAllDescriptions(game.description)}
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
            gameId={resolved.id}
            isFav={isFav}
            favCount={game.favoriteCount}
            gameTags={tags.map((t) => ({ name: t.name, color: t.group?.color || t.color, groupName: t.group?.name }))}
            vndbId={game.vndbId ?? undefined}
            releaseDate={game.releaseDate ? new Date(game.releaseDate).toLocaleDateString("zh-CN") : undefined}
            gameDuration={game.gameDuration ?? undefined}
            studioName={game.studioName ?? undefined}
            username={session?.user?.name || undefined}
            userAvatar={session?.user?.image || null}
            resourceTagColor={resourceTagColor}
            publisherId={game.publisher?.id}
          />
      </div>

      <RelatedGames games={relatedGames} />
    </div>
  )
}