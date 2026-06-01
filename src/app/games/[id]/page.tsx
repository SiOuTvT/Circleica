import { GameBreadcrumb } from "@/components/game-breadcrumb"
import GameDetailClient from "@/components/game-detail-client"
import { GameDetailTopClient } from "@/components/game-detail-top-client"
import { GameGallery } from "@/components/game-gallery"
import { RelatedGames } from "@/components/related-games"
import { SafeImage } from "@/components/safe-image"
import { ViewCounter } from "@/components/view-counter"
import { auth } from "@/lib/auth"
import { getAllDescriptions, getDescriptionText } from "@/lib/parse-description"
import { safeParse } from "@/lib/parse-utils"
import { prisma } from "@/lib/prisma"
import { isNumericId } from "@/lib/serial-id"
import { unstable_cache } from "next/cache"
import Image from "next/image"
import { notFound, redirect } from "next/navigation"

/**
 * 游戏详情页 — 支持两种 URL 格式：
 *   /games/1         (serialId，新格式)
 *   /games/clxxx     (cuid，旧格式 → 301 重定向到 serialId URL)
 */

// ── 查找游戏：优先 serialId，回退 cuid ──────────────────────────────
async function resolveGame(id: string) {
  if (isNumericId(id)) {
    const numId = parseInt(id, 10)
    if (isNaN(numId) || numId <= 0) return null
    return prisma.game.findUnique({ where: { serialId: numId }, select: { id: true, serialId: true } })
  }
  return prisma.game.findUnique({ where: { id }, select: { id: true, serialId: true } })
}

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
  const session = await auth()

  // 查找游戏
  const resolved = await resolveGame(id)
  if (!resolved) notFound()

  // 如果是 cuid 格式访问 → 301 重定向到 serialId URL
  if (!isNumericId(id)) {
    redirect(`/games/${resolved.serialId}`)
  }

  // ISR：缓存游戏详情查询，60秒内复用，减少数据库压力
  const getCachedGameDetail = unstable_cache(
    async (gameId: string) => {
        return prisma.game.findFirst({
        where: { id: gameId, isPublished: true },
        include: {
          tags: { select: { tag: { select: { id: true, name: true, color: true, group: { select: { color: true, name: true } } } } } },
          resources: { select: { language: true, runType: true, resourceContent: true } },
          comments: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { id: true, username: true, avatar: true } } },
          },
          creators: {
            include: { creator: { select: { id: true, name: true, nameJa: true, avatar: true } } },
          },
          publisher: { select: { id: true, username: true, avatar: true } },
        },
      })
    },
    ["game-detail-page"],
    { revalidate: 60, tags: ["game-detail"] }
  )
  const game = await getCachedGameDetail(resolved.id)

  if (!game) notFound()

  const tags = game.tags.map((t) => t.tag)

  // 从所有资源中收集去重的 resourceTags（语言、运行方式、资源内容）
  const resourceTags: string[] = [...new Set(
    game.resources.flatMap((r) => {
      const items: string[] = []
      try { items.push(...JSON.parse(r.language)) } catch {}
      try { items.push(...JSON.parse(r.runType)) } catch {}
      try { items.push(...JSON.parse(r.resourceContent)) } catch {}
      return items
    })
  )]

  // 相关游戏推荐：按共同标签匹配
  const tagNames = tags.map((t) => t.name)
  const relatedGames =
    tagNames.length > 0
      ? await prisma.game.findMany({
          where: {
            id: { not: resolved.id },
            isPublished: true,
            tags: { some: { tag: { name: { in: tagNames } } } },
          },
          select: { id: true, serialId: true, title: true, coverImage: true, originalWork: true },
          orderBy: { favoriteCount: "desc" },
          take: 8,
        })
      : []
  const screenshots = safeParse<string[]>(game.screenshots, [])
  const downloadLinks = safeParse<{ label: string; url: string }[]>(game.downloadLinks, [])

  let isFav = false
  if (session?.user?.id) {
    const fav = await prisma.favorite.findUnique({
      where: { userId_gameId: { userId: session.user.id, gameId: resolved.id } },
    })
    isFav = !!fav
  }

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c').replace(/>/g, '\\u003e') }}
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
            className="flex flex-col min-w-0"
            style={{
              minHeight: "auto",
              borderRadius: "16px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            {/* ①号位：封面图 3:2，融入卡片顶部 */}
            <div className="shrink-0 min-w-0">
              <div
                className="relative overflow-hidden w-full"
                  style={{
                  aspectRatio: "17 / 9",
                  borderRadius: "12px 12px 0 0",
                }}
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
                    <span className="text-muted-foreground/40 text-sm">暂无封面</span>
                  </div>
                )}
              </div>
            </div>

            {/* ②号位：标题 → 标签 → 按钮 → 发布者 → 数据 */}
            <div className="flex flex-col flex-1 px-2.5 sm:px-5 pb-3 sm:pb-4 pt-2 min-h-0 min-w-0">

              {/* ① 游戏标题 */}
              <div className="mb-1">
                <h1
                  className="font-black leading-tight"
                  style={{ fontSize: "clamp(16px, 2.2vw, 24px)", color: "hsl(var(--foreground))", fontWeight: 900 }}
                >
                  {game.title}
                </h1>
                {game.originalWork && (
                  <p className="mt-1 text-xs text-muted-foreground/70">原作：{game.originalWork}</p>
                )}
              </div>

              {/* ② 标签行（SFW/NSFW + 资源标签） */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5 mb-2">
                {/* SFW/NSFW 标识 */}
                <span
                    className="inline-block text-[12px] font-bold px-2 py-0.5 rounded"
                  style={{
                    color: game.isNsfw ? "var(--clr-rose)" : "var(--clr-blue)",
                    background: game.isNsfw ? "rgba(231,76,111,0.1)" : "rgba(52,152,219,0.1)",
                  }}
                >
                  {game.isNsfw ? "NSFW" : "SFW"}
                </span>
                {/* 资源标签（语言/运行方式/资源内容，来自 GameResource）— 颜色跟随主题色 */}
                {resourceTags.map((tag) => (
                  <span
                    key={tag}
                    className="game-card-tag inline-block text-[13px] font-medium px-2.5 py-1 rounded-md max-w-[96px] truncate"
                    title={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* ③ 功能按钮行（紧凑模式，等宽三列） */}
              <div className="mb-2">
                <GameDetailTopClient
                  gameId={resolved.id}
                  downloadLinks={downloadLinks}
                  isFav={isFav}
                  isLoggedIn={!!session}
                  compact
                  scrollToResources
                />
              </div>

              {/* ④ 发布者信息 */}
              <div className="flex items-center gap-3">
                {game.publisher?.avatar ? (
                  <Image
                    src={game.publisher.avatar}
                    alt={game.publisher.username}
                    width={48}
                    height={48}
                    className="rounded-full object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                    style={{ background: "linear-gradient(135deg, var(--clr-sky), var(--clr-blue))" }}
                  >
                    {game.publisher ? game.publisher.username[0] : "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-foreground truncate">
                    {game.publisher ? game.publisher.username : "本站发布"}
                  </p>
                  <p className="text-xs text-muted-foreground/70">{timeAgo}</p>
                </div>
              </div>

              {/* ⑤ 人气数据 */}
              <div className="flex items-center gap-4 mt-auto pt-3">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span className="font-bold tabular-nums">{game.viewCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span className="font-bold tabular-nums">{game.downloadCount}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  <span className="font-bold tabular-nums">{game.favoriteCount}</span>
                </span>
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
      <div className="py-6 sm:py-8 lg:py-12">
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
          />
      </div>

      <RelatedGames games={relatedGames} />
    </div>
  )
}