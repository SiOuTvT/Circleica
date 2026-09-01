import { prisma, Prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getMainNsfwMode, type MainNsfwMode } from "@/lib/nsfw-mode"
import { buildWorkTextOr } from "@/lib/credits-works"

/** Game 体系 NSFW 模式过滤片段（归档页封面用）：sfw 排除 isNsfw / nsfw 只留 isNsfw / all 不过滤 */
async function creatorsNsfwWhere(): Promise<Record<string, boolean>> {
  const mode: MainNsfwMode = await getMainNsfwMode()
  if (mode === "sfw") return { isNsfw: false }
  if (mode === "nsfw") return { isNsfw: true }
  return {}
}

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

/** 列表检索条件（getCreators / countCreators 共用，避免两处口径漂移） */
function buildCreatorWhere(search: string) {
  const q = search.trim()
  // 主站隔离：仅列出关联「主站已发布游戏」的创作者，杜绝串入副站(VNDB 摄入)数据。
  const publishedGameFilter = { games: { some: { game: { isPublished: true } } }, source: "circleica" }
  if (!q) return publishedGameFilter
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { nameJa: { contains: q, mode: "insensitive" as const } },
      // 作品名命中：该创作者参与过的任一已发布作品的标题 / 英文名 / 别名
      {
        games: {
          some: {
            game: { isPublished: true, OR: buildWorkTextOr(q) },
          },
        },
      },
    ],
    ...publishedGameFilter,
  }
}

/**
 * 列表计数：只统计「关联主站已发布游戏」的创作者数量（与 getCreators 口径一致）。
 *
 * 存在意义：列表页服务端只需要一个总数用于页头文案与密度推导，
 * 若为此调用 getCreators 会连带执行 findMany + _count + 角色取数（大库下 1000 行级），
 * 且结果被整份丢弃 —— 在弱服务器上是可观的无谓开销。
 */
export async function countCreators(opts: { search?: string } = {}): Promise<number> {
  try {
    return await prisma.creator.count({ where: buildCreatorWhere(opts.search ?? "") })
  } catch (e) {
    logger.db.error("[countCreators] 统计创作者失败", e)
    return 0
  }
}

/**
 * 列表：直接查 Creator 表（带已发布作品数 + 派生角色）。
 * 排序在内存完成（Archive 列表索引场景由客户端取全量后分组）。
 */
export async function getCreators(opts: {
  search?: string
  sort?: "count" | "name"
  page?: number
  /** 自定义页大小；不传用 CREATOR_LIST_PAGE_SIZE。Archive 列表索引场景由客户端分批增量拉取。 */
  pageSize?: number
}): Promise<CreatorListResult> {
  const { search = "", sort = "count", page = 1, pageSize } = opts
  const size = Math.min(Math.max(pageSize ?? CREATOR_LIST_PAGE_SIZE, 1), 500)
  const pageNum = Math.max(1, page)

  const where = buildCreatorWhere(search)

  // 命中创作者（仅取 id + 展示名，开销极小）：排序与计数在内存完成，
  // 以保证「参与 N 部作品」按「去重后的已发布作品数」口径一致（一人多职位只算一部）。
  let matched: Array<{ id: string; name: string; nameJa: string | null }> = []
  let total = 0
  try {
    ;[matched, total] = await Promise.all([
      prisma.creator.findMany({ where, select: { id: true, name: true, nameJa: true } }),
      prisma.creator.count({ where }),
    ])
  } catch (e) {
    logger.db.error("[getCreators] 拉取创作者失败", e)
    return { creators: [], total: 0, totalPages: 1, page: pageNum }
  }

  // 一次聚合：每个创作者「去重后的已发布作品数」（替代旧 _count.games 的关联行计数，
  // 避免一人多职位被数成多部作品）。
  const cntMap = new Map<string, number>()
  if (matched.length) {
    const rows = await prisma.$queryRaw<{ creatorId: string; cnt: number }[]>`
      SELECT gc."creatorId" AS "creatorId", COUNT(DISTINCT gc."gameId")::int AS cnt
      FROM "GameCreator" gc
      JOIN "Game" g ON g.id = gc."gameId"
      WHERE g."isPublished" = true AND gc."creatorId" IN (${Prisma.join(matched.map((c) => c.id))})
      GROUP BY gc."creatorId"
    `
    for (const r of rows) cntMap.set(r.creatorId, r.cnt)
  }

  const sortKey = (c: { name: string; nameJa: string | null }) => c.nameJa || c.name
  const ranked = matched
    .map((c) => ({ ...c, gameCount: cntMap.get(c.id) ?? 0 }))
    .sort(
      sort === "name"
        ? (a, b) => sortKey(a).localeCompare(sortKey(b), "zh-Hans-CN")
        : (a, b) => b.gameCount - a.gameCount || a.name.localeCompare(b.name, "zh-Hans-CN"),
    )

  const totalPages = Math.max(1, Math.ceil(total / size))
  const pageItems = ranked.slice((pageNum - 1) * size, pageNum * size)

  let pageCreators: Array<{
    id: string
    name: string
    nameJa: string | null
    avatar: string | null
    slug: string | null
    games: { role: string }[]
  }> = []
  if (pageItems.length) {
    try {
      pageCreators = await prisma.creator.findMany({
        where: { id: { in: pageItems.map((p) => p.id) } },
        include: {
          games: { where: { game: { isPublished: true } }, select: { role: true }, take: 12 },
        },
      })
    } catch (e) {
      logger.db.error("[getCreators] 拉取本页角色失败", e)
    }
  }
  const pageMap = new Map(pageCreators.map((c) => [c.id, c]))
  const summaries: CreatorSummary[] = pageItems.map((p) => {
    const c = pageMap.get(p.id)!
    return {
      id: c.id,
      name: c.name,
      nameJa: c.nameJa || null,
      avatar: c.avatar || null,
      slug: c.slug ?? null,
      gameCount: p.gameCount,
      roles: Array.from(new Set(c.games.map((g) => g.role))),
    }
  })

  return { creators: summaries, total, totalPages, page: pageNum }
}

export interface CreatorGameItem {
  id: string
  serialId: number
  title: string
  coverImage: string | null
  releaseDate: string | null
  favoriteCount: number
  role: string
  /** 该创作者在这部作品里的全部职位（一人兼多职时多项），用于卡片上的职位小字行 */
  roles: string[]
}

export interface CreatorStudioItem {
  /** Archive 稳定可读路由（CJK 直出），与 id 解耦 */
  slug: string
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
    // ⚠️ 作品列表（含封面）按 NSFW 模式过滤：SFW 用户不看到露骨封面
    const nsfwWhere = await creatorsNsfwWhere()
    creator = await prisma.creator.findFirst({
      where: { slug: key, source: "circleica" },
      include: {
        games: {
          where: { game: { isPublished: true, ...nsfwWhere } },
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
    // 口径与 makers.ts 的 COUNT(DISTINCT …) 对齐：统计「该人参与的去重游戏数」，
    // 而非 GameCreator 关联行数（一人多职位会被数成多部作品）。TYPE-MOON 对 Ryuusoul 例：4 → 2。
    const rows = await prisma.$queryRaw<{ studioId: string; cnt: number }[]>`
      SELECT gs."studioId" AS "studioId", COUNT(DISTINCT gc."gameId")::int AS cnt
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
          return s ? { slug: s.slug, normalized: s.normalizedName, name: s.displayName, gameCount: r.cnt } : null
        })
        .filter((x): x is CreatorStudioItem => x !== null)
        .sort((a, b) => b.gameCount - a.gameCount)
    }
  } catch (e) {
    logger.db.error("[getCreatorDetail] 统计所属制作组失败", e)
  }

  // 去重后的已发布作品数（替代旧 _count.games 的关联行计数，一人多职位只算一部）
  let totalGames = 0
  try {
    const gameCountRow = await prisma.$queryRaw<{ cnt: number }[]>`
      SELECT COUNT(DISTINCT gc."gameId")::int AS cnt
      FROM "GameCreator" gc
      JOIN "Game" g ON g.id = gc."gameId"
      WHERE gc."creatorId" = ${creator.id} AND g."isPublished" = true
    `
    totalGames = gameCountRow[0]?.cnt ?? 0
  } catch (e) {
    logger.db.error("[getCreatorDetail] 统计去重作品数失败", e)
  }
  const totalPages = Math.max(1, Math.ceil(totalGames / DETAIL_PAGE_SIZE))

  // 同一部作品把该创作者的所有职位聚合成 roles：一人兼多职时卡片上写「原画、脚本」，
  // 同时避免同一部作品因多个职位而重复出现多张卡。
  const gamesById = new Map<string, CreatorGameItem>()
  for (const g of creator.games) {
    const hit = gamesById.get(g.game.id)
    if (hit) {
      if (!hit.roles.includes(g.role)) hit.roles.push(g.role)
      continue
    }
    gamesById.set(g.game.id, {
      id: g.game.id,
      serialId: g.game.serialId,
      title: g.game.title,
      coverImage: g.game.coverImage,
      releaseDate: g.game.releaseDate ? g.game.releaseDate.toISOString() : null,
      favoriteCount: g.game.favoriteCount,
      role: g.role,
      roles: [g.role],
    })
  }

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
    games: [...gamesById.values()],
    studios,
    totalPages,
    page: safePage,
  }
}

/**
 * 旧路由兼容：按 id（旧 URL 参数）查当前 slug，供 /creators/[id] redirect 使用。
 * 只返回主站 Creator 的 slug，不拉副站/VNDB/Random 数据。
 */
/**
 * 随机取一位「本站已发布作品」的创作者 slug（供首页/侧栏「随机创作者」跳转）。
 *
 * 资源站边界：只在本站 Creator 表内随机，不走 VNDB。
 * M2 之后 Creator 详情统一是 /credits/creator/[slug]，VNDB 数字 id 在主站没有落地页，
 * 用它跳转必然 404 —— 所以随机入口必须从本站库取 slug。
 * 无数据时返回 null，由调用方降级（绝不注入假数据）。
 */
export async function getRandomCreatorSlug(): Promise<string | null> {
  try {
    const publishedGameFilter = { games: { some: { game: { isPublished: true } } }, source: "circleica" }
    const where = { ...publishedGameFilter }
    const total = await prisma.creator.count({ where })
    if (total === 0) return null

    const skip = Math.floor(Math.random() * total)
    const picked = await prisma.creator.findFirst({
      where,
      select: { slug: true },
      orderBy: { id: "asc" },
      skip,
    })
    return picked?.slug ?? null
  } catch (e) {
    logger.db.error("[getRandomCreatorSlug] 查询失败", e)
    return null
  }
}

export async function getCreatorSlugById(id: string): Promise<string | null> {
  if (!id) return null
  try {
    const c = await prisma.creator.findUnique({
      where: { id, source: "circleica" },
      select: { slug: true },
    })
    return c?.slug ?? null
  } catch (e) {
    logger.db.error("[getCreatorSlugById] 查询失败", e)
    return null
  }
}
