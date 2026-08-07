import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { cached, cacheKey } from "@/lib/redis"
import { getMainNsfwMode, type MainNsfwMode } from "@/lib/nsfw-mode"

/** Game 体系 NSFW 模式过滤片段（归档页封面用）：sfw 排除 isNsfw / nsfw 只留 isNsfw / all 不过滤 */
async function makersNsfwWhere(): Promise<Record<string, boolean>> {
  const mode: MainNsfwMode = await getMainNsfwMode()
  if (mode === "sfw") return { isNsfw: false }
  if (mode === "nsfw") return { isNsfw: true }
  return {}
}

/**
 * 制作组/社团档案数据层（Circleica 资源站专用）
 *
 * 数据模型：Studio 实体 + GameStudio 多对多关联（Studio 表为唯一真源，
 * 不再依赖 Game.studioName 自由文本）。本层直接查 Studio 表聚合，
 * 调用方（credits-client / studio/[name] 页）契约不变。
 *
 * 数据边界：只用本站 Game / Creator / Studio 数据，不拉 Galvelica 全量资料库。
 */

export interface MakerSummary {
  /** 展示名（Studio.displayName） */
  name: string
  /** 归一 key（Studio.normalizedName），用作路由参数与去重 */
  normalized: string
  /** Archive 稳定可读路由（CJK 直出），与 normalizedName 职责分离 */
  slug: string | null
  gameCount: number
  coverImage: string | null
  creatorCount: number
}

export interface MakerGameItem {
  id: string
  serialId: number
  title: string
  coverImage: string
  releaseDate: string | null
  favoriteCount: number
}

export interface MakerCreatorItem {
  id: string
  /** Archive 稳定可读路由（CJK 直出），与 id 解耦 */
  slug: string | null
  name: string
  nameJa: string | null
  avatar: string | null
  roles: string[]
}

export interface MakerDetail {
  name: string
  normalized: string
  /** Archive 稳定可读路由（CJK 直出），与 normalizedName 职责分离 */
  slug: string | null
  gameCount: number
  coverImage: string | null
  games: MakerGameItem[]
  totalPages: number
  page: number
  creators: MakerCreatorItem[]
}

export interface MakerListResult {
  makers: MakerSummary[]
  total: number
  totalPages: number
  page: number
}

export const LIST_PAGE_SIZE = 24
const DETAIL_PAGE_SIZE = 24

/**
 * 列表：直接查 Studio 表（带已发布作品数 + 代表封面 + 关联创作者数）。
 * 一次 $queryRaw 聚合关联创作者，避免 N+1。
 */
/** 列表检索条件（getMakers / countMakers 共用，避免两处口径漂移） */
function buildMakerWhere(search: string) {
  const q = search.trim()
  return q
    ? {
        OR: [
          { displayName: { contains: q, mode: "insensitive" as const } },
          { aliases: { contains: q } },
        ],
      }
    : {}
}

/**
 * 列表计数：只统计「有已发布作品」的制作组数量（与 getMakers 的 visible 口径一致）。
 *
 * 存在意义：列表页服务端只需要一个总数用于页头文案与密度推导，
 * 若为此调用 getMakers 会连带执行 findMany + _count + 封面取数 + $queryRaw 创作者聚合，
 * 且结果被整份丢弃 —— 在弱服务器上是可观的无谓开销。
 */
export async function countMakers(opts: { search?: string } = {}): Promise<number> {
  try {
    return await prisma.studio.count({
      where: {
        ...buildMakerWhere(opts.search ?? ""),
        // 与列表一致：仅计入拥有已发布作品者（同时也是主/副站数据的隔离边界）
        games: { some: { game: { isPublished: true } } },
      },
    })
  } catch (e) {
    logger.db.error("[countMakers] 统计制作组失败", e)
    return 0
  }
}

export async function getMakers(opts: {
  search?: string
  sort?: "count" | "name"
  page?: number
  /** 自定义页大小；不传用 LIST_PAGE_SIZE。Archive 列表索引场景由客户端分批增量拉取（不再一次取全量）。 */
  pageSize?: number
}): Promise<MakerListResult> {
  const { search = "", sort = "count", page = 1, pageSize } = opts
  const size = Math.min(Math.max(pageSize ?? LIST_PAGE_SIZE, 1), 1000)
  const pageNum = Math.max(1, page)

  // 分页下沉到 SQL：只拉当前页 + 计数，杜绝全表加载后在内存排序切片（大库下每次请求全表扫描是性能黑洞）。
  // 排序以 SQL 为准（跨页稳定）：count = 已发布作品数降序 + 展示名兜底；name = 展示名升序。
  // 注：orderBy 的 _count 统计的是关联表全量（未过滤 isPublished），与展示口径的过滤计数存在理论上限差异，
  // 未发布草稿量极少时影响可忽略，换取 SQL 分页的正确性与稳定性。
  const where = {
    ...buildMakerWhere(search),
    // 与 countMakers 一致：仅计入拥有已发布作品者（主/副站隔离边界）
    games: { some: { game: { isPublished: true } } },
  }
  const orderBy = sort === "name"
    ? [{ displayName: "asc" as const }]
    : [{ games: { _count: "desc" as const } }, { displayName: "asc" as const }]

  let studios: Array<{
    id: string
    displayName: string
    normalizedName: string
    slug: string | null
    _count: { games: number }
    games: { game: { coverImage: string | null; favoriteCount: number } }[]
  }> = []
  let total = 0
  try {
    // ⚠️ 代表封面（最热游戏封面）按 NSFW 模式过滤：SFW 用户不看到露骨封面
    const nsfwWhere = await makersNsfwWhere()
    ;[studios, total] = await Promise.all([
      prisma.studio.findMany({
        where,
        orderBy,
        skip: (pageNum - 1) * size,
        take: size,
        include: {
          _count: { select: { games: { where: { game: { isPublished: true } } } } },
          games: {
            where: { game: { isPublished: true, ...nsfwWhere } },
            select: { game: { select: { coverImage: true, favoriteCount: true } } },
            orderBy: { game: { favoriteCount: "desc" } },
            take: 1,
          },
        },
      }),
      prisma.studio.count({ where }),
    ])
  } catch (e) {
    logger.db.error("[getMakers] 拉取制作组失败", e)
    return { makers: [], total: 0, totalPages: 1, page: pageNum }
  }

  // 关联创作者数（一次聚合，避免 N+1）。
  // 该全表 GROUP BY 在大库下偶发慢查询，且每次翻页都重跑 → 放大连接池压力、偶发触发客户端 15s 超时（"加载失败"主因之一）。
  // 缓存 60s：数据实时性要求低（制作组关联创作者数），且创作者数随发布变化频率远低于请求频率。
  const creatorCountByStudio = await cached(
    cacheKey("makers", "creatorCountByStudio"),
    async () => {
      const map = new Map<string, number>()
      try {
        const rows = await prisma.$queryRaw<{ studioId: string; cnt: number }[]>`
          SELECT gs."studioId" AS "studioId", COUNT(DISTINCT gc."creatorId")::int AS cnt
          FROM "GameStudio" gs
          JOIN "Game" g ON g.id = gs."gameId"
          JOIN "GameCreator" gc ON gc."gameId" = g.id
          WHERE g."isPublished" = true
          GROUP BY gs."studioId"
        `
        for (const r of rows) map.set(r.studioId, r.cnt)
      } catch (e) {
        logger.db.error("[getMakers] 统计关联创作者失败", e)
      }
      return map
    },
    60,
  )

  const makers: MakerSummary[] = studios.map((s) => ({
    name: s.displayName,
    normalized: s.normalizedName,
    slug: s.slug ?? null,
    gameCount: s._count.games,
    coverImage: s.games[0]?.game.coverImage ?? null,
    creatorCount: creatorCountByStudio.get(s.id) ?? 0,
  }))

  const totalPages = Math.max(1, Math.ceil(total / size))
  return { makers, total, totalPages, page: pageNum }
}

/**
 * 详情：查单 Studio（按 slug），附已发布作品（含关联创作者）+ 代表封面。
 */
export async function getMakerDetail(slug: string, page = 1): Promise<MakerDetail | null> {
  const key = slug.trim()
  if (!key) return null

  let studio: {
    displayName: string
    normalizedName: string
    slug: string | null
    games: {
      game: {
        id: string
        serialId: number
        title: string
        coverImage: string
        releaseDate: Date | null
        favoriteCount: number
        creators: {
          role: string
          creator: { id: string; slug: string | null; name: string; nameJa: string | null; avatar: string | null; vndbId: string }
        }[]
      }
    }[]
  } | null
  try {
    // ⚠️ 作品列表（含封面）按 NSFW 模式过滤：SFW 用户不看到露骨封面
    const nsfwWhere = await makersNsfwWhere()
    studio = await prisma.studio.findUnique({
      where: { slug: key },
      include: {
        games: {
          where: { game: { isPublished: true, ...nsfwWhere } },
          include: {
            game: {
              select: {
                id: true,
                serialId: true,
                title: true,
                coverImage: true,
                releaseDate: true,
                favoriteCount: true,
                creators: {
                  include: { creator: true },
                },
              },
            },
          },
          orderBy: { game: { favoriteCount: "desc" } },
        },
      },
    })
  } catch (e) {
    logger.db.error("[getMakerDetail] 拉取制作组详情失败", e)
    return null
  }

  if (!studio) return null

  const ownedGames = studio.games.map((gs) => gs.game)

  // 代表封面
  let cover: string | null = null
  let maxFav = -1
  for (const g of ownedGames) {
    if (g.favoriteCount > maxFav && g.coverImage) {
      maxFav = g.favoriteCount
      cover = g.coverImage
    }
  }

  // 关联创作者（去重，附带角色集合）
  const creatorMap = new Map<string, MakerCreatorItem>()
  for (const g of ownedGames) {
    for (const c of g.creators) {
      const cid = c.creator.vndbId ? `s${c.creator.vndbId}` : c.creator.id
      if (!cid) continue
      const existing = creatorMap.get(cid)
      if (existing) {
        if (c.role && !existing.roles.includes(c.role)) existing.roles.push(c.role)
      } else {
        creatorMap.set(cid, {
          id: cid,
          slug: c.creator.slug || null,
          name: c.creator.name,
          nameJa: c.creator.nameJa || null,
          avatar: c.creator.avatar || null,
          roles: c.role ? [c.role] : [],
        })
      }
    }
  }
  const creators = Array.from(creatorMap.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))

  // 作品分页（按 favoriteCount 降序）
  const sortedGames = [...ownedGames].sort(
    (a, b) => b.favoriteCount - a.favoriteCount || a.title.localeCompare(b.title, "zh-Hans-CN"),
  )
  const total = sortedGames.length
  const totalPages = Math.max(1, Math.ceil(total / DETAIL_PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * DETAIL_PAGE_SIZE
  const pagedGames: MakerGameItem[] = sortedGames.slice(start, start + DETAIL_PAGE_SIZE).map((g) => ({
    id: g.id,
    serialId: g.serialId,
    title: g.title,
    coverImage: g.coverImage,
    releaseDate: g.releaseDate ? g.releaseDate.toISOString() : null,
    favoriteCount: g.favoriteCount,
  }))

  return {
    name: studio.displayName,
    normalized: studio.normalizedName,
    slug: studio.slug ?? null,
    gameCount: total,
    coverImage: cover,
    games: pagedGames,
    totalPages,
    page: safePage,
    creators,
  }
}

/**
 * 旧路由兼容：按 normalizedName（旧 URL 参数）查当前 slug，供 /credits/studio/[name] redirect 使用。
 * 只返回主站 Studio 的 slug，不拉副站数据。
 */
export async function getStudioSlugByName(normalizedName: string): Promise<string | null> {
  const key = normalizedName.trim().toLowerCase()
  if (!key) return null
  try {
    const s = await prisma.studio.findUnique({
      where: { normalizedName: key },
      select: { slug: true },
    })
    return s?.slug ?? null
  } catch (e) {
    logger.db.error("[getStudioSlugByName] 查询失败", e)
    return null
  }
}
