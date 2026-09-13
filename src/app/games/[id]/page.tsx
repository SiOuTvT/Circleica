import { GameBreadcrumb } from "@/components/game-breadcrumb"
import GameDetailClient from "@/components/game-detail-client"
import { GameDetailTopClient } from "@/components/game-detail-top-client"
import { SafeImage } from "@/components/safe-image"
import { ViewCounter } from "@/components/view-counter"
import { ViewHistoryRecorder } from "@/components/view-history-recorder"
import { logger } from "@/lib/logger"
import { getAllDescriptions, getDescriptionText } from "@/lib/parse-description"
import { safeParse } from "@/lib/parse-utils"
import { formatZhDate } from "@/lib/date"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { isNumericId } from "@/lib/serial-id"
import { timeAgoPublished } from "@/lib/time-ago"
import { Tag } from "@/components/ui/tag"
import { TagRow } from "@/components/tag-row"
import { Download, Heart, Library } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { unstable_cache } from "next/cache"
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
    select: { serialId: true, title: true, description: true, coverImage: true, originalWork: true },
  }) : null
  if (!game) {
    return {
      title: "游戏未找到",
      description: "未找到该游戏。",
      robots: { index: false, follow: true },
    }
  }
  return {
    title: `${game.title}`,
    description: getDescriptionText(game.description)?.slice(0, 160) || `${game.originalWork ? `${game.originalWork}同人游戏` : "同人游戏"} - ${game.title}`,
    openGraph: {
      siteName: "Circleica",
      title: game.title,
      description: getDescriptionText(game.description)?.slice(0, 160) || "",
      images: game.coverImage ? [{ url: game.coverImage, width: 800, height: 1000 }] : [{ url: "/opengraph-image", width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: game.title,
      images: game.coverImage ? [game.coverImage] : ["/opengraph-image"],
    },
    alternates: { canonical: `/games/${game.serialId}` },
  }
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // auth 和 resolveGame 无依赖，并行执行
  const resolved = await resolveGame(id)
  if (!resolved) notFound()
  const gameId = resolved.id

  // 如果是 cuid 格式访问 → 301 重定向到 serialId URL
  if (!isNumericId(id)) {
    redirect(`/games/${resolved.serialId}`)
  }

  // 查询游戏详情（评论只加载前 20 条，其余通过 API 分页加载）
  async function fetchGame() {
    return prisma.game.findFirst({
      where: { id: gameId, isPublished: true },
      include: {
        tags: { select: { tag: { select: { id: true, name: true, color: true, group: { select: { color: true, name: true } } } } } },
        resources: { select: { platform: true, language: true, runType: true, resourceContent: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
        creators: {
          include: { creator: { select: { id: true, name: true, nameJa: true, avatar: true, slug: true } } },
        },
        studios: {
          include: { studio: { select: { displayName: true, normalizedName: true, slug: true } } },
        },
        publisher: { select: { id: true, username: true, avatar: true } },
        galvelicaWork: { select: { slug: true } },
      },
    })
  }

  type GameData = NonNullable<Awaited<ReturnType<typeof fetchGame>>>
  // A-8（方案 A）：主体数据走 Data Cache + cache tag，写路径通过 revalidateTag 失效。
  // 个性化字段（isFav / 身份）不进入缓存，由客户端 API 按需拉取。
  const gameResult = await unstable_cache(() => fetchGame(), ["game-detail", gameId], {
    revalidate: 1800,
    tags: ["game-detail", `game:${gameId}`],
  })()
  if (!gameResult) notFound()
  const game: GameData = gameResult

  const tags = game.tags.map((t) => t.tag)

  // 标签组色：资源标签组（绿，详情页资源筛选/资源标签用）与详情页信息栏标签组（粉，游戏题材标签用）。
  // 两者分别与后台「资源标签」「详情页信息栏标签」分组颜色照应，避免前后台颜色不一致。
  // 收藏状态（isFav）属个性化字段，已从服务端移除，由客户端 /api/games/[id]/personalization 拉取。
  const [resourceTagColor, detailHeaderTagColor] = await Promise.all([
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
      } catch (err) { logger.game.warn("[GameDetailPage] resourceTagColor query failed", { error: err instanceof Error ? err.message : String(err) }) }
      return "#22c55e"
    })(),
    (async () => {
      try {
        const cacheKeyDetail = cacheKey("tagGroup", "detail_header", "color")
        const cachedColor = await cache.get<string>(cacheKeyDetail)
        if (cachedColor) return cachedColor
        const group = await prisma.tagGroup.findFirst({
          where: { id: "preset_detail_header" },
          select: { color: true },
        })
        if (group?.color) {
          await cache.set(cacheKeyDetail, group.color, 3600)
          return group.color
        }
      } catch (err) { logger.game.warn("[GameDetailPage] detailHeaderTagColor query failed", { error: err instanceof Error ? err.message : String(err) }) }
      // 与后台「详情页信息栏标签」组默认粉色照应
      return "#f472b6"
    })(),
  ])

  // 从所有资源中收集去重的 resourceTags（平台、语言、运行方式、资源内容）。
  // 兼容数组与 JSON 字符串（历史存 JSON.stringify 的字段），避免标签丢失。
  const parseTagsArr = (field: unknown): string[] => safeParse<string[]>(field, [])
  const resourceTags: string[] = [...new Set(
    game.resources.flatMap((r) => [
      ...parseTagsArr(r.platform),
      ...parseTagsArr(r.language),
      ...parseTagsArr(r.runType),
      ...parseTagsArr(r.resourceContent),
    ])
  )]

  const screenshots = safeParse<string[]>(game.screenshots, [])
  const downloadLinks = safeParse<{ label: string; url: string }[]>(game.downloadLinks, [])
  const platforms = safeParse<string[]>(game.platforms, [])
  const languages = safeParse<string[]>(game.languages, [])

  const creators = game.creators.map((gc) => ({
    id: gc.creator.id,
    slug: gc.creator.slug,
    name: gc.creator.name,
    nameJa: gc.creator.nameJa,
    avatar: gc.creator.avatar,
    role: gc.role,
  }))

  // 计算发布时间相对描述（H2 统一为 timeAgoPublished）
  const releaseLabel = timeAgoPublished(game.createdAt)

  // 识别区 facts 行的取值：空值由渲染处判断，整项不渲染
  const releaseDateLabel = game.releaseDate ? formatZhDate(game.releaseDate) : undefined
  const studioLabel = game.studios[0]?.studio.displayName || undefined

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
      <GameBreadcrumb gameId={String(game.serialId)} gameTitle={game.title} />

      {/* ═══════════════════════════════════════════════
          顶部识别区 — 左竖版海报 + 右信息列
          海报横向让位后 H1 直接顶到首屏上部，不再被卡片内的 16:9 封面图压下去
      ═══════════════════════════════════════════════ */}
      <div className="flex min-w-0 items-start gap-5">

        {/* ─── 左：竖版海报（lg 168×224，lg 以下 144×192）─── */}
        <div className="relative h-[192px] w-[144px] shrink-0 overflow-hidden rounded-lg border border-border lg:h-[224px] lg:w-[168px]">
          {game.coverImage ? (
            <SafeImage
              src={game.coverImage}
              alt={game.title}
              fill
              className="object-cover"
              draggable={false}
              sizes="(max-width: 1024px) 144px, 168px"
              priority
              quality={80}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <span className="text-xs text-muted-foreground/40">封面还没上传~</span>
            </div>
          )}
        </div>

        {/* ─── 右：信息列 ─── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">

          {/* ① 标题 + 原作（同一行 baseline，去掉「原作：」前缀） */}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="font-bold leading-tight text-foreground text-xl sm:text-2xl lg:text-3xl">
              {game.title}
            </h1>
            {game.originalWork && (
              <span className="text-[15px] text-muted-foreground">{game.originalWork}</span>
            )}
          </div>

          {/* ② facts：发行日期 / 制作会社 / 时长 / 浏览 — 没有值的整项不渲染 */}
          <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2">
            {releaseDateLabel && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">发行日期</span>
                <span className="text-[13px] font-semibold text-foreground">{releaseDateLabel}</span>
              </div>
            )}
            {studioLabel && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">制作会社</span>
                <span className="text-[13px] font-semibold text-foreground">{studioLabel}</span>
              </div>
            )}
            {game.gameDuration && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">时长</span>
                <span className="text-[13px] font-semibold text-foreground">{game.gameDuration}</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">浏览</span>
              <span className="text-[13px] font-semibold tabular-nums text-foreground">{game.viewCount.toLocaleString()}</span>
            </div>
          </div>

          {/* ③ 标签行 — 单行不换行，超出横向滚动（右缘渐隐），信息列高度不随标签数失控 */}
          <TagRow className="mt-2 sm:mt-2.5 mb-3 sm:mb-4" singleLine>
            {/* SFW/NSFW 标识 — 语义色令牌 */}
            <Tag color={game.isNsfw ? "var(--color-error)" : "var(--color-info)"} className="shrink-0">
              {game.isNsfw ? "NSFW" : "SFW"}
            </Tag>
            {/* 资源标签（语言/运行方式/资源内容，来自 GameResource）— 用资源标签组色，与后台「资源标签」组一致 */}
            {resourceTags.map((tag) => (
              <Tag key={tag} color={resourceTagColor || undefined} className="shrink-0 whitespace-nowrap" title={tag}>
                {tag}
              </Tag>
            ))}
          </TagRow>

          {/* ⑤ 动作组：下载资源 / 收藏 / 分享 */}
          <div>
            <GameDetailTopClient
              gameId={resolved.id}
              downloadLinks={downloadLinks}
              compact
              scrollToResources
            />
          </div>

          {/* ④ 发布者信息（移到动作组下方） */}
          <div className="mt-3 flex items-center gap-2.5 sm:gap-3">
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
                {game.publisher?.username?.[0] || "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground/80 sm:text-foreground truncate">
                {game.publisher ? game.publisher.username : "本站发布"}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground/50 sm:text-muted-foreground/70">{releaseLabel}</p>
            </div>
          </div>

          {/* ④ 人气数据 */}
          <div className="flex items-center gap-4 sm:gap-5 pt-4 sm:pt-5 mt-3 sm:mt-4 border-t border-border/40">
            <ViewCounter gameId={resolved.id} initialCount={game.viewCount} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground" />
            <ViewHistoryRecorder targetType="GAME" targetId={resolved.id} />
            <span className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
              <Download className="h-3.5 w-3.5" />
              <span className="font-bold tabular-nums">{game.downloadCount}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
              <Heart className="h-3.5 w-3.5" />
              <span className="font-bold tabular-nums">{game.favoriteCount}</span>
            </span>
            {game.galvelicaWork?.slug ? (
              <Link
                href={`/galvelica/works/${game.galvelicaWork.slug}`}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--gal-accent)_12%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--gal-accent)] ring-1 ring-[color-mix(in_srgb,var(--gal-accent)_28%,transparent)] transition duration-150 ease-in-out hover:bg-[color-mix(in_srgb,var(--gal-accent)_22%,transparent)]"
                title="在 Galvelica 资料库查看本作完整资料"
              >
                <Library className="h-3.5 w-3.5" />
                副站资料
              </Link>
            ) : (
              <Link
                href={`/galvelica/works?search=${encodeURIComponent(game.title)}`}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--gal-accent)_12%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--gal-accent)] ring-1 ring-[color-mix(in_srgb,var(--gal-accent)_28%,transparent)] transition duration-150 ease-in-out hover:bg-[color-mix(in_srgb,var(--gal-accent)_22%,transparent)]"
                title="本作尚未收录进 Galvelica 资料库，去副站查找或申请收录"
              >
                <Library className="h-3.5 w-3.5" />
                副站查资料
              </Link>
            )}
          </div>
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
              createdAt: typeof c.createdAt === 'string' ? c.createdAt : c.createdAt.toISOString(),
              parentId: c.parentId ?? null,
              user: c.user,
            }))}
            gameId={resolved.id}
            gameTitle={game.title}
            favCount={game.favoriteCount}
            screenshots={screenshots}
            gameTags={tags.map((t) => ({ name: t.name, color: detailHeaderTagColor || t.color || "#6b7280", groupName: t.group?.name }))}
            originalWork={game.originalWork ? game.originalWork : undefined}
            vndbId={game.vndbId ?? undefined}
            releaseDate={game.releaseDate ? formatZhDate(game.releaseDate) : undefined}
            gameDuration={game.gameDuration ?? undefined}
            studios={game.studios.map((s) => ({ name: s.studio.displayName, normalized: s.studio.normalizedName, slug: s.studio.slug, role: s.role ?? null }))}
            platforms={platforms}
            officialWebsite={game.officialWebsite ? game.officialWebsite : undefined}
            languages={languages}
            originalLanguage={game.originalLanguage ? game.originalLanguage : undefined}
            ageRating={game.ageRating ? game.ageRating : undefined}
            englishName={game.englishName ? game.englishName : undefined}
            status={game.status}
            resourceTagColor={resourceTagColor}
            publisherId={game.publisher?.id}
          />
      </div>

    </div>
  )
}