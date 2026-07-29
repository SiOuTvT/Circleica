import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

/**
 * 制作组/社团档案数据层（Circleica 资源站专用）
 *
 * 说明：Circleica 的 Game.studioName 是自由文本品牌名（由 VNDB 摄入填充），
 * 没有规范化的 Studio 实体。本层在查询时按 studioName 归一（trim + 小写）聚合，
 * 派生出「制作组」条目。未来若建 Studio 实体（从 VNDB producer 规范），
 * 只需把这里的聚合切换为查 Studio 表，调用方无需改动。
 *
 * 数据边界：只用本站 Game / Creator 数据，不拉 Galvelica 全量资料库。
 */

export interface MakerSummary {
  /** 展示名（取该归一名下出现频率最高的原始写法） */
  name: string
  /** 归一 key（小写 trim），用作路由参数与去重 */
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

const LIST_PAGE_SIZE = 24
const DETAIL_PAGE_SIZE = 24

function normalizeStudioName(raw: string): string {
  return raw.trim().toLowerCase()
}

interface RawGameRow {
  id: string
  serialId: number
  title: string
  coverImage: string
  studioName: string
  favoriteCount: number
  releaseDate: Date | null
  creators: { role: string; creator: { id: string; name: string; nameJa: string | null; avatar: string; vndbId: string } }[]
}

/**
 * 拉取所有已发布且有 studioName 的游戏（含其创作者）。
 * 站点为同人资源站，游戏体量可控，一次性聚合后再在内存中分页/排序。
 * 若未来游戏量变大，应改为 Studio 实体 + 预聚合表。
 */
async function fetchPublishedGamesWithMakers(): Promise<RawGameRow[]> {
  return prisma.game.findMany({
    where: { isPublished: true, studioName: { not: "" } },
    select: {
      id: true,
      serialId: true,
      title: true,
      coverImage: true,
      studioName: true,
      favoriteCount: true,
      releaseDate: true,
      creators: {
        select: {
          role: true,
          creator: { select: { id: true, name: true, nameJa: true, avatar: true, vndbId: true } },
        },
      },
    },
    orderBy: { favoriteCount: "desc" },
  }) as Promise<RawGameRow[]>
}

export async function getMakers(opts: {
  search?: string
  sort?: "count" | "name"
  page?: number
}): Promise<MakerListResult> {
  const { search = "", sort = "count", page = 1 } = opts
  const pageNum = Math.max(1, page)

  let games: RawGameRow[]
  try {
    games = await fetchPublishedGamesWithMakers()
  } catch (e) {
    logger.db.error("[getMakers] 拉取制作组失败", e)
    return { makers: [], total: 0, totalPages: 1, page: pageNum }
  }

  // 搜索过滤（按 studioName 不区分大小写）
  const q = search.trim().toLowerCase()
  const filtered = q ? games.filter((g) => g.studioName.toLowerCase().includes(q)) : games

  // 按归一 studioName 聚合
  const map = new Map<string, { display: string; displayCount: number; games: RawGameRow[] }>()
  for (const g of filtered) {
    const key = normalizeStudioName(g.studioName)
    if (!key) continue
    const entry = map.get(key)
    if (entry) {
      entry.games.push(g)
      entry.displayCount++
    } else {
      map.set(key, { display: g.studioName, displayCount: 1, games: [g] })
    }
  }

  const makers: MakerSummary[] = []
  for (const [key, entry] of map.entries()) {
    // 代表封面 = 该组 favoriteCount 最高的游戏封面
    let cover: string | null = null
    let maxFav = -1
    const creatorIds = new Set<string>()
    for (const g of entry.games) {
      if (g.favoriteCount > maxFav && g.coverImage) {
        maxFav = g.favoriteCount
        cover = g.coverImage
      }
      for (const c of g.creators) {
        if (!c.creator.id) continue
        creatorIds.add(c.creator.id)
      }
    }
    makers.push({
      name: entry.display,
      normalized: key,
      gameCount: entry.games.length,
      coverImage: cover,
      creatorCount: creatorIds.size,
    })
  }

  // 排序
  if (sort === "name") {
    makers.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))
  } else {
    makers.sort((a, b) => b.gameCount - a.gameCount || a.name.localeCompare(b.name, "zh-Hans-CN"))
  }

  const total = makers.length
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE))
  const safePage = Math.min(pageNum, totalPages)
  const start = (safePage - 1) * LIST_PAGE_SIZE
  const paged = makers.slice(start, start + LIST_PAGE_SIZE)

  return { makers: paged, total, totalPages, page: safePage }
}

export async function getMakerDetail(name: string, page = 1): Promise<MakerDetail | null> {
  const key = normalizeStudioName(name)
  if (!key) return null

  let games: RawGameRow[]
  try {
    games = await fetchPublishedGamesWithMakers()
  } catch (e) {
    logger.db.error("[getMakerDetail] 拉取制作组详情失败", e)
    return null
  }

  const owned = games.filter((g) => normalizeStudioName(g.studioName) === key)
  if (owned.length === 0) return null

  // 展示名：取该组出现频率最高的原始写法
  const displayCount = new Map<string, number>()
  for (const g of owned) displayCount.set(g.studioName, (displayCount.get(g.studioName) ?? 0) + 1)
  let displayName = owned[0].studioName
  let max = -1
  for (const [n, c] of displayCount) {
    if (c > max) {
      max = c
      displayName = n
    }
  }

  // 代表封面
  let cover: string | null = null
  let maxFav = -1
  for (const g of owned) {
    if (g.favoriteCount > maxFav && g.coverImage) {
      maxFav = g.favoriteCount
      cover = g.coverImage
    }
  }

  // 关联创作者（去重，附带角色集合）
  const creatorMap = new Map<string, MakerCreatorItem>()
  for (const g of owned) {
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
  const sortedGames = [...owned].sort(
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
    name: displayName,
    normalized: key,
    gameCount: total,
    coverImage: cover,
    games: pagedGames,
    totalPages,
    page: safePage,
    creators,
  }
}
