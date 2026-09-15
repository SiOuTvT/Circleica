import { GameBreadcrumb } from "@/components/game-breadcrumb"
import GameDetailClient from "@/components/game-detail-client"
import { GameDetailTopClient } from "@/components/game-detail-top-client"
import { SafeImage } from "@/components/safe-image"
import { ViewHistoryRecorder } from "@/components/view-history-recorder"
import { logger } from "@/lib/logger"
import { getAllDescriptions, getDescriptionText } from "@/lib/parse-description"
import { safeParse } from "@/lib/parse-utils"
import { formatZhDate } from "@/lib/date"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { isNumericId } from "@/lib/serial-id"
import { Tag } from "@/components/ui/tag"
import { TagRow } from "@/components/tag-row"
import { Download, Eye, Heart } from "lucide-react"
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
          take: 50,
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

  // 首屏别名行：库里是逗号分隔字符串（半角/全角都认），trim 去空后顿号连接
  const aliasList = (game.aliases || "")
    .split(/[,，]/)
    .map((a) => a.trim())
    .filter(Boolean)
  // 简介摘要与简介 tab 共用同一份纯文本
  const descriptionText = getDescriptionText(game.description)

  const creators = game.creators.map((gc) => ({
    id: gc.creator.id,
    slug: gc.creator.slug,
    name: gc.creator.name,
    nameJa: gc.creator.nameJa,
    avatar: gc.creator.avatar,
    role: gc.role,
  }))

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
          顶部识别区 — 两列网格（≥sm）：海报 208 / 信息列 minmax(0,1fr)
          动作组回到信息列最后一行横排；<sm 纵向堆叠：海报 → 信息列（含动作组）
      ═══════════════════════════════════════════════ */}
      <div className="flex min-w-0 flex-col gap-2 sm:grid sm:grid-cols-[208px_minmax(0,1fr)] sm:gap-6">

        {/* 浏览历史记录器（无 UI）：原先挂在人气数据行里，那行已删，这里单独保留以继续记录 */}
        <ViewHistoryRecorder targetType="GAME" targetId={resolved.id} />

        {/* ─── 左：竖版海报（3:4；sm 起 208×280，窄屏 156×210）─── */}
        <div className="relative h-[210px] w-[156px] shrink-0 overflow-hidden rounded-lg border border-border sm:h-[280px] sm:w-[208px]">
          {game.coverImage ? (
            <SafeImage
              src={game.coverImage}
              alt={game.title}
              fill
              className="object-cover"
              draggable={false}
              sizes="(max-width: 640px) 156px, 208px"
              priority
              quality={80}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <span className="text-xs text-muted-foreground/40">封面还没上传~</span>
            </div>
          )}
        </div>

        {/* ─── 右：信息列（行间距固定 12px，不靠拉伸对齐）─── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">

          {/* ① 标题 + 原作（同一行 baseline，去掉「原作：」前缀） */}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <h1 className="font-bold leading-[1.15] text-foreground text-xl sm:text-2xl lg:text-[34px]">
              {game.title}
            </h1>
            {game.originalWork && (
              <span className="text-[15px] text-muted-foreground">{game.originalWork}</span>
            )}
          </div>

          {/* ② 别名：库里是逗号分隔字符串，顿号连接；最多 4 个，超出补「等 N 个」；空值整行不渲染 */}
          {aliasList.length > 0 && (
            <p className="text-[13px] text-muted-foreground">
              {aliasList.slice(0, 4).join("、")}
              {aliasList.length > 4 ? ` 等 ${aliasList.length} 个` : ""}
            </p>
          )}

          {/* ③ 数据行：浏览 / 下载 / 收藏 —— 一行文字，无边框、无底色、不包卡 */}
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
              <span className="text-[13px] text-muted-foreground">浏览</span>
              <span className="text-[15px] font-bold tabular-nums text-foreground">
                {game.viewCount.toLocaleString()}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
              <span className="text-[13px] text-muted-foreground">下载</span>
              <span className="text-[15px] font-bold tabular-nums text-foreground">
                {game.downloadCount.toLocaleString()}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
              <span className="text-[13px] text-muted-foreground">收藏</span>
              <span className="text-[15px] font-bold tabular-nums text-foreground">
                {game.favoriteCount.toLocaleString()}
              </span>
            </span>
          </div>

          {/* ④ 资源标签行：眉标固定不随滚动，pill 单行横滑（右缘渐隐） */}
          <div className="flex items-center gap-2.5">
            <span className="shrink-0 text-[11px] text-muted-foreground">资源标签</span>
            <TagRow className="min-w-0 flex-1" singleLine>
              {/* SFW/NSFW 标识 — 语义色令牌 */}
              <Tag scale="detail" color={game.isNsfw ? "var(--color-error)" : "var(--color-info)"} className="shrink-0">
                {game.isNsfw ? "NSFW" : "SFW"}
              </Tag>
              {/* 资源标签（语言/运行方式/资源内容，来自 GameResource）— 用资源标签组色，与后台「资源标签」组一致 */}
              {resourceTags.map((tag) => (
                <Tag key={tag} scale="detail" color={resourceTagColor || undefined} className="shrink-0 whitespace-nowrap" title={tag}>
                  {tag}
                </Tag>
              ))}
            </TagRow>
          </div>

          {/* ⑤ 动作组：收藏 / 下载 / 分享 / 副站资料库 —— 横排、按内容自适应宽（信息列最后一行） */}
          <GameDetailTopClient
            gameId={resolved.id}
            downloadLinks={downloadLinks}
            compact
            scrollToResources
            galvelicaHref={
              game.galvelicaWork?.slug
                ? `/galvelica/works/${game.galvelicaWork.slug}`
                : `/galvelica/works?search=${encodeURIComponent(game.title)}`
            }
            galvelicaTitle={
              game.galvelicaWork?.slug
                ? "在 Galvelica 资料库查看本作完整资料"
                : "本作尚未收录进 Galvelica 资料库，去副站查找或申请收录"
            }
          />

        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          下方内容区 — Tab 式详情
      ═══════════════════════════════════════════════ */}
      <div className="pt-9 pb-6 sm:pt-6 sm:pb-8 lg:pt-6 lg:pb-12">
          <GameDetailClient
            description={descriptionText}
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