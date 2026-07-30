import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

/**
 * 创作者档案数据层（Circleica 资源站专用）
 *
 * 数据模型：Creator 实体 + GameCreator 多对多关联（Creator 表为唯一真源）。
 * 本层直接查 Creator 表聚合，调用方（creator 列表/详情页）契约一致。
 *
 * 数据边界：只用本站 Game / Creator / Studio 数据，不拉 Galvelica 全量资料库。
 * DB 不可达时返回安全空（列表）或 null（详情），绝不注入假数据。
 */

export interface CreatorSummary {
  id: string
  name: string
  nameJa?: string | null
  avatar?: string | null
  /** Archive 稳定可读路由（CJK 直出），与 id 解耦 */
  slug: string | null
  gameCount: number
  roles: string[]
}

export interface CreatorListResult {
  creators: CreatorSummary[]
  total: number
  totalPages: number
  page: number
}

export const CREATOR_LIST_PAGE_SIZE = 24

/**
 * 列表：直接查 Creator 表（带已发布作品数 + 派生角色）。
 * 排序在内存完成（Archive 列表索引场景由客户端取全量后分组）。
 */
export async function getCreators(opts: {
  search?: string
  sort?: "count" | "name"
  page?: number
  /** 自定义页大小；不传用 CREATOR_LIST_PAGE_SIZE。Archive 列表索引场景传大值取全量。 */
  pageSize?: number
}): Promise<CreatorListResult> {
  const { search = "", sort = "count", page = 1, pageSize } = opts
  const size = Math.min(Math.max(pageSize ?? CREATOR_LIST_PAGE_SIZE, 1), 1000)
  const pageNum = Math.max(1, page)

  // 主站隔离：仅列出关联「主站已发布游戏」的创作者，杜绝串入副站(VNDB 摄入)数据。
  const publishedGameFilter = { games: { some: { game: { isPublished: true } } } }
  const where = search.trim()
    ? {
        OR: [
          { name: { contains: search.trim(), mode: "insensitive" as const } },
          { nameJa: { contains: search.trim(), mode: "insensitive" as const } },
        ],
        ...publishedGameFilter,
      }
    : publishedGameFilter

  let creators: Array<{
    id: string
    name: string
    nameJa: string
    avatar: string
    slug: string | null
    _count: { games: number }
    games: { role: string }[]
  }>
  try {
    creators = await prisma.creator.findMany({
      where,
      include: {
        _count: { select: { games: { where: { game: { isPublished: true } } } } },
        games: {
          where: { game: { isPublished: true } },
          select: { role: true },
          take: 12,
        },
      },
    })
  } catch (e) {
    logger.db.error("[getCreators] 拉取创作者失败", e)
    return { creators: [], total: 0, totalPages: 1, page: pageNum }
  }

  const summaries: CreatorSummary[] = creators.map((c) => ({
    id: c.id,
    name: c.name,
    nameJa: c.nameJa || null,
    avatar: c.avatar || null,
    slug: c.slug ?? null,
    gameCount: c._count.games,
    roles: Array.from(new Set(c.games.map((g) => g.role))),
  }))

  if (sort === "name") {
    summaries.sort((a, b) => (a.nameJa || a.name).localeCompare(b.nameJa || b.name, "ja"))
  } else {
    summaries.sort((a, b) => b.gameCount - a.gameCount)
  }

  const total = summaries.length
  const totalPages = Math.max(1, Math.ceil(total / size))
  const safePage = Math.min(pageNum, totalPages)
  const start = (safePage - 1) * size
  const paged = summaries.slice(start, start + size)

  return { creators: paged, total, totalPages, page: safePage }
}

export interface CreatorGameItem {
  id: string
  serialId: number
  title: string
  coverImage: string | null
  releaseDate: string | null
  favoriteCount: number
  role: string
}

export interface CreatorStudioItem {
  /** Archive 稳定可读路由（CJK 直出），与 id 解耦 */
  slug: string | null
  normalized: string
  name: string
  gameCount: number
}

export interface CreatorDetail {
  id: string
  /** Archive 稳定可读路由（CJK 直出），与 id 解耦 */
  slug: string | null
  name: string
  nameJa: string | null
  avatar: string | null
  bio: string
  gender: string
  vndbId: string
  twitterUrl: string
  wikipediaUrl: string
  gameCount: number
  roles: string[]
  games: CreatorGameItem[]
  studios: CreatorStudioItem[]
  totalPages: number
  page: number
}

const DETAIL_PAGE_SIZE = 24

/**
 * 详情：本地 Creator 聚合（作品 + 所属制作组），按 slug 查询。
 * 与 Studio 详情（getMakerDetail）同构，作为 Creator Archive 详情页数据源。
 * 只用主站本地数据，不拉副站/VNDB/Random。
 */
export async function getCreatorDetail(slug: string, page = 1): Promise<CreatorDetail | null> {
  const key = slug.trim()
  if (!key) return null
  const safePage = Math.max(1, page)

  let creator: {
    id: string
    slug: string | null
    name: string
    nameJa: string
    avatar: string
    bio: string
    gender: string
    vndbId: string
    twitterUrl: string
    wikipediaUrl: string
    _count: { games: number }
    games: Array<{
      role: string
      game: {
        id: string
        serialId: number
        title: string
        coverImage: string | null
        releaseDate: Date | null
        favoriteCount: number
      }
    }>
  } | null
  try {
    creator = await prisma.creator.findUnique({
      where: { slug: key },
      include: {
        games: {
          where: { game: { isPublished: true } },
          select: {
            role: true,
            game: {
              select: {
                id: true,
                serialId: true,
                title: true,
                coverImage: true,
                releaseDate: true,
                favoriteCount: true,
              },
            },
          },
          orderBy: { game: { favoriteCount: "desc" } },
          skip: (safePage - 1) * DETAIL_PAGE_SIZE,
          take: DETAIL_PAGE_SIZE,
        },
        _count: { select: { games: { where: { game: { isPublished: true } } } } },
      },
    })
  } catch (e) {
    logger.db.error("[getCreatorDetail] 拉取创作者失败", e)
    return null
  }
  if (!creator) return null

  const roles = Array.from(new Set(creator.games.map((g) => g.role)))

  // 所属制作组：一次聚合，避免 N+1
  let studios: CreatorStudioItem[] = []
  try {
    const rows = await prisma.$queryRaw<{ studioId: string; cnt: number }[]>`
      SELECT gs."studioId" AS "studioId", COUNT(*)::int AS cnt
      FROM "GameCreator" gc
      JOIN "GameStudio" gs ON gs."gameId" = gc."gameId"
      JOIN "Game" g ON g.id = gc."gameId"
      WHERE gc."creatorId" = ${creator.id} AND g."isPublished" = true
      GROUP BY gs."studioId"
    `
    if (rows.length) {
      const studioRows = await prisma.studio.findMany({
        where: { id: { in: rows.map((r) => r.studioId) } },
        select: { id: true, slug: true, normalizedName: true, displayName: true },
      })
      const map = new Map(studioRows.map((s) => [s.id, s]))
      studios = rows
        .map((r) => {
          const s = map.get(r.studioId)
          return s ? { slug: s.slug ?? null, normalized: s.normalizedName, name: s.displayName, gameCount: r.cnt } : null
        })
        .filter((x): x is CreatorStudioItem => x !== null)
        .sort((a, b) => b.gameCount - a.gameCount)
    }
  } catch (e) {
    logger.db.error("[getCreatorDetail] 统计所属制作组失败", e)
  }

  const totalGames = creator._count.games
  const totalPages = Math.max(1, Math.ceil(totalGames / DETAIL_PAGE_SIZE))

  return {
    id: creator.id,
    slug: creator.slug ?? null,
    name: creator.name,
    nameJa: creator.nameJa || null,
    avatar: creator.avatar || null,
    bio: creator.bio || "",
    gender: creator.gender || "",
    vndbId: creator.vndbId || "",
    twitterUrl: creator.twitterUrl || "",
    wikipediaUrl: creator.wikipediaUrl || "",
    gameCount: totalGames,
    roles,
    games: creator.games.map((g) => ({
      id: g.game.id,
      serialId: g.game.serialId,
      title: g.game.title,
      coverImage: g.game.coverImage,
      releaseDate: g.game.releaseDate ? g.game.releaseDate.toISOString() : null,
      favoriteCount: g.game.favoriteCount,
      role: g.role,
    })),
    studios,
    totalPages,
    page: safePage,
  }
}

/**
 * 旧路由兼容：按 id（旧 URL 参数）查当前 slug，供 /creators/[id] redirect 使用。
 * 只返回主站 Creator 的 slug，不拉副站/VNDB/Random 数据。
 */
export async function getCreatorSlugById(id: string): Promise<string | null> {
  if (!id) return null
  try {
    const c = await prisma.creator.findUnique({
      where: { id },
      select: { slug: true },
    })
    return c?.slug ?? null
  } catch (e) {
    logger.db.error("[getCreatorSlugById] 查询失败", e)
    return null
  }
}
