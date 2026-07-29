import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

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
  name: string
  nameJa: string | null
  avatar: string | null
  roles: string[]
}

export interface MakerDetail {
  name: string
  normalized: string
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
export async function getMakers(opts: {
  search?: string
  sort?: "count" | "name"
  page?: number
  /** 自定义页大小；不传用 LIST_PAGE_SIZE。Archive 列表索引场景传大值取全量。 */
  pageSize?: number
}): Promise<MakerListResult> {
  const { search = "", sort = "count", page = 1, pageSize } = opts
  const size = Math.min(Math.max(pageSize ?? LIST_PAGE_SIZE, 1), 1000)
  const pageNum = Math.max(1, page)

  const where = search.trim()
    ? {
        OR: [
          { displayName: { contains: search.trim(), mode: "insensitive" as const } },
          { aliases: { contains: search.trim() } },
        ],
      }
    : {}

  let studios: Array<{
    id: string
    displayName: string
    normalizedName: string
    _count: { games: number }
    games: { game: { coverImage: string | null; favoriteCount: number } }[]
  }>
  try {
    studios = await prisma.studio.findMany({
      where,
      include: {
        _count: { select: { games: { where: { game: { isPublished: true } } } } },
        games: {
          where: { game: { isPublished: true } },
          select: { game: { select: { coverImage: true, favoriteCount: true } } },
          orderBy: { game: { favoriteCount: "desc" } },
          take: 1,
        },
      },
    })
  } catch (e) {
    logger.db.error("[getMakers] 拉取制作组失败", e)
    return { makers: [], total: 0, totalPages: 1, page: pageNum }
  }

  // 关联创作者数（一次聚合，避免 N+1）
  const creatorCountByStudio = new Map<string, number>()
  try {
    const rows = await prisma.$queryRaw<{ studioId: string; cnt: number }[]>`
      SELECT gs."studioId" AS "studioId", COUNT(DISTINCT gc."creatorId")::int AS cnt
      FROM "GameStudio" gs
      JOIN "Game" g ON g.id = gs."gameId"
      JOIN "GameCreator" gc ON gc."gameId" = g.id
      WHERE g."isPublished" = true
      GROUP BY gs."studioId"
    `
    for (const r of rows) creatorCountByStudio.set(r.studioId, r.cnt)
  } catch (e) {
    logger.db.error("[getMakers] 统计关联创作者失败", e)
  }

  const makers: MakerSummary[] = studios.map((s) => ({
    name: s.displayName,
    normalized: s.normalizedName,
    gameCount: s._count.games,
    coverImage: s.games[0]?.game.coverImage ?? null,
    creatorCount: creatorCountByStudio.get(s.id) ?? 0,
  }))

  // 仅展示有已发布作品者
  const visible = makers.filter((m) => m.gameCount > 0)
  if (sort === "name") {
    visible.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))
  } else {
    visible.sort((a, b) => b.gameCount - a.gameCount || a.name.localeCompare(b.name, "zh-Hans-CN"))
  }

  const total = visible.length
  const totalPages = Math.max(1, Math.ceil(total / size))
  const safePage = Math.min(pageNum, totalPages)
  const start = (safePage - 1) * size
  const paged = visible.slice(start, start + size)

  return { makers: paged, total, totalPages, page: safePage }
}

/**
 * 详情：查单 Studio（按 normalizedName），附已发布作品（含关联创作者）+ 代表封面。
 */
export async function getMakerDetail(name: string, page = 1): Promise<MakerDetail | null> {
  const key = name.trim().toLowerCase()
  if (!key) return null

  let studio: {
    displayName: string
    normalizedName: string
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
          creator: { id: string; name: string; nameJa: string | null; avatar: string | null; vndbId: string }
        }[]
      }
    }[]
  } | null
  try {
    studio = await prisma.studio.findUnique({
      where: { normalizedName: key },
      include: {
        games: {
          where: { game: { isPublished: true } },
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
                  include: { creator: { select: { id: true, name: true, nameJa: true, avatar: true, vndbId: true } } },
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
    gameCount: total,
    coverImage: cover,
    games: pagedGames,
    totalPages,
    page: safePage,
    creators,
  }
}
