import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getMainNsfwMode, type MainNsfwMode } from "@/lib/nsfw-mode"
import { toVariants } from "@/lib/search-variant"
import { roleLabel } from "@/lib/role-labels"
import type { Prisma } from "@/generated/prisma/client"

/**
 * 制作组 / 创作者图鉴「按作品」视图数据层
 *
 * 与主站资源边界一致：只取本站已发布 Game，不拉副站 Galvelica / VNDB 数据。
 * 两个入口都下沉到 SQL 分页（skip/take + count），不做全表加载后在内存切片。
 * DB 不可达时返回安全空，绝不注入假数据。
 *
 * 选字段口径对齐游戏卡（GAME_CARD_SELECT 的封面 / 计数三个字段），
 * 不额外拉取简介、截图、资源等大字段。
 */

/** Game 体系 NSFW 模式过滤片段：sfw 排除 isNsfw / nsfw 只留 isNsfw / all 不过滤 */
async function worksNsfwWhere(): Promise<Record<string, boolean>> {
  const mode: MainNsfwMode = await getMainNsfwMode()
  if (mode === "sfw") return { isNsfw: false }
  if (mode === "nsfw") return { isNsfw: true }
  return {}
}

/** 已发布 + NSFW 过滤后的作品筛选片段（列表与计数共用，避免两处口径漂移） */
type GameFilter = Prisma.GameWhereInput

/**
 * 作品文本匹配：标题 / 英文名 / 别名，忽略大小写 + 简繁变体（复用搜索页口径）。
 * 为空查询返回空数组，由调用方决定是否拼进 where。
 */
export function buildWorkTextOr(q: string): GameFilter[] {
  const trimmed = q.trim()
  if (!trimmed) return []
  const or: GameFilter[] = []
  for (const v of toVariants(trimmed)) {
    or.push({ title: { contains: v, mode: "insensitive" as const } })
    or.push({ englishName: { contains: v, mode: "insensitive" as const } })
    or.push({ aliases: { contains: v, mode: "insensitive" as const } })
  }
  return or
}

/* ─────────────── 创作者页：作品 + 班底 ─────────────── */

export interface CrewMember {
  id: string
  /** 卡片上展示的名字（日文名优先） */
  displayName: string
  /** Archive 稳定可读路由（CJK 直出） */
  slug: string
}

export interface WorkCrewRow {
  role: string
  label: string
  members: CrewMember[]
}

export interface WorkCrewItem {
  id: string
  serialId: number
  title: string
  /** 英文名：空串时不渲染（约一半作品没有） */
  englishName: string | null
  coverImage: string | null
  releaseDate: string | null
  viewCount: number
  downloadCount: number
  favoriteCount: number
  /** 制作组：没挂制作组时为 null，卡片上整段不渲染 */
  studioName: string | null
  studioSlug: string | null
  crew: WorkCrewRow[]
}

export interface WorkCrewResult {
  games: WorkCrewItem[]
  total: number
  totalPages: number
  page: number
}

export const WORKS_PAGE_SIZE = 24

/**
 * 班底行顺序：导演 → 脚本 → 原画 → 角色设计 → 音乐。
 * 其余角色（staff / 翻译 / QA / 校对 / 主题曲…）合并为末尾「其他」一行。
 * 某角色下没有人名时该行整行不渲染（由调用方按 members.length 判断）。
 */
const CREW_ROW_ORDER = ["director", "scenario", "art", "chardesign", "music"] as const

/** 同名去重（一个人可能跨多个剩余角色出现）+ 按展示名排序 */
function dedupeMembers(list: CrewMember[]): CrewMember[] {
  const seen = new Set<string>()
  const out: CrewMember[] = []
  for (const m of list) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
  }
  return out.sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-Hans-CN"))
}

/**
 * 「按作品」视图（创作者页）：以游戏为单元，带该作品的班底名单。
 *
 * 排序沿用站内既有口径（收藏数降序 + 标题兜底），与制作组/创作者详情页的作品列表一致。
 */
export async function getWorkCrewWorks(opts: {
  search?: string
  page?: number
  pageSize?: number
}): Promise<WorkCrewResult> {
  const { search = "", page = 1, pageSize } = opts
  const size = Math.min(Math.max(pageSize ?? WORKS_PAGE_SIZE, 1), 100)
  const pageNum = Math.max(1, page)
  const nsfwWhere = await worksNsfwWhere()
  const textOr = buildWorkTextOr(search)
  const where: GameFilter = {
    isPublished: true,
    ...nsfwWhere,
    ...(textOr.length ? { OR: textOr } : {}),
  }

  let games: Array<{
    id: string
    serialId: number
    title: string
    englishName: string
    coverImage: string
    releaseDate: Date | null
    viewCount: number
    downloadCount: number
    favoriteCount: number
    studios: { studio: { displayName: string; slug: string } }[]
    creators: { role: string; creator: { id: string; name: string; nameJa: string; slug: string } }[]
  }> = []
  let total = 0
  try {
    ;[games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy: [{ favoriteCount: "desc" }, { title: "asc" }],
        skip: (pageNum - 1) * size,
        take: size,
        select: {
          id: true,
          serialId: true,
          title: true,
          englishName: true,
          coverImage: true,
          releaseDate: true,
          viewCount: true,
          downloadCount: true,
          favoriteCount: true,
          studios: {
            select: { studio: { select: { displayName: true, slug: true } } },
            take: 1,
          },
          creators: {
            select: {
              role: true,
              creator: { select: { id: true, name: true, nameJa: true, slug: true } },
            },
          },
        },
      }),
      prisma.game.count({ where }),
    ])
  } catch (e) {
    logger.db.error("[getWorkCrewWorks] 拉取作品班底失败", e)
    return { games: [], total: 0, totalPages: 1, page: pageNum }
  }

  const items: WorkCrewItem[] = games.map((g) => {
    const byRole = new Map<string, CrewMember[]>()
    const others: CrewMember[] = []
    for (const c of g.creators) {
      const member: CrewMember = {
        id: c.creator.id,
        displayName: c.creator.nameJa || c.creator.name,
        slug: c.creator.slug,
      }
      if ((CREW_ROW_ORDER as readonly string[]).includes(c.role)) {
        const bucket = byRole.get(c.role)
        if (bucket) bucket.push(member)
        else byRole.set(c.role, [member])
      } else {
        others.push(member)
      }
    }

    const crew: WorkCrewRow[] = []
    for (const role of CREW_ROW_ORDER) {
      const members = dedupeMembers(byRole.get(role) ?? [])
      if (members.length > 0) crew.push({ role, label: roleLabel(role), members })
    }
    const otherMembers = dedupeMembers(others)
    if (otherMembers.length > 0) crew.push({ role: "other", label: "其他", members: otherMembers })

    return {
      id: g.id,
      serialId: g.serialId,
      title: g.title,
      englishName: g.englishName?.trim() ? g.englishName : null,
      coverImage: g.coverImage || null,
      releaseDate: g.releaseDate ? g.releaseDate.toISOString() : null,
      viewCount: g.viewCount,
      downloadCount: g.downloadCount,
      favoriteCount: g.favoriteCount,
      studioName: g.studios[0]?.studio.displayName ?? null,
      studioSlug: g.studios[0]?.studio.slug ?? null,
      crew,
    }
  })

  return { games: items, total, totalPages: Math.max(1, Math.ceil(total / size)), page: pageNum }
}

/* ─────────────── 制作组页：组 + 旗下作品行 ─────────────── */

export interface StudioWorkGame {
  id: string
  serialId: number
  title: string
  coverImage: string | null
  /** 发行日期（ISO）；为空时卡片上不显示年份 */
  releaseDate: string | null
  viewCount: number
  favoriteCount: number
}

export interface StudioWorksItem {
  slug: string
  normalized: string
  name: string
  gameCount: number
  games: StudioWorkGame[]
}

export interface StudioWorksResult {
  studios: StudioWorksItem[]
  total: number
  totalPages: number
  page: number
}

export const STUDIO_WORKS_PAGE_SIZE = 24
/** 单卡内作品行上限（卡片是概览，不做无限展开；绝大多数组只有 1 部作品） */
const STUDIO_GAMES_LIMIT = 12

/**
 * 「按作品」视图（制作组页）：以制作组为单元，组内按作品逐行。
 *
 * 组内作品排序沿用站内既有口径（收藏数降序），与制作组详情页的作品列表一致。
 */
export async function getStudioWorks(opts: {
  search?: string
  sort?: "count" | "name"
  page?: number
  pageSize?: number
}): Promise<StudioWorksResult> {
  const { search = "", sort = "count", page = 1, pageSize } = opts
  const size = Math.min(Math.max(pageSize ?? STUDIO_WORKS_PAGE_SIZE, 1), 100)
  const pageNum = Math.max(1, page)
  const nsfwWhere = await worksNsfwWhere()
  const textOr = buildWorkTextOr(search)
  const gameFilter: GameFilter = { isPublished: true, ...nsfwWhere }

  // 搜索同时命中组名与该组旗下任一已发布作品的标题 / 英文名 / 别名
  const where: Prisma.StudioWhereInput = {
    games: { some: { game: gameFilter } },
    ...(textOr.length
      ? {
          OR: [
            { displayName: { contains: search.trim(), mode: "insensitive" as const } },
            { games: { some: { game: { ...gameFilter, OR: textOr } } } },
          ],
        }
      : {}),
  }

  const orderBy: Prisma.StudioOrderByWithRelationInput[] =
    sort === "name"
      ? [{ displayName: "asc" }]
      : [{ games: { _count: "desc" } }, { displayName: "asc" }]

  let studios: Array<{
    displayName: string
    normalizedName: string
    slug: string
    _count: { games: number }
    games: {
      game: {
        id: string
        serialId: number
        title: string
        coverImage: string
        releaseDate: Date | null
        viewCount: number
        favoriteCount: number
      }
    }[]
  }> = []
  let total = 0
  try {
    ;[studios, total] = await Promise.all([
      prisma.studio.findMany({
        where,
        orderBy,
        skip: (pageNum - 1) * size,
        take: size,
        include: {
          _count: { select: { games: { where: { game: gameFilter } } } },
          games: {
            where: { game: gameFilter },
            select: {
              game: {
                select: {
                  id: true,
                  serialId: true,
                  title: true,
                  coverImage: true,
                  releaseDate: true,
                  viewCount: true,
                  favoriteCount: true,
                },
              },
            },
            orderBy: { game: { favoriteCount: "desc" } },
            take: STUDIO_GAMES_LIMIT,
          },
        },
      }),
      prisma.studio.count({ where }),
    ])
  } catch (e) {
    logger.db.error("[getStudioWorks] 拉取制作组作品失败", e)
    return { studios: [], total: 0, totalPages: 1, page: pageNum }
  }

  const items: StudioWorksItem[] = studios.map((s) => ({
    name: s.displayName,
    normalized: s.normalizedName,
    slug: s.slug,
    gameCount: s._count.games,
    games: s.games.map((gs) => ({
      id: gs.game.id,
      serialId: gs.game.serialId,
      title: gs.game.title,
      coverImage: gs.game.coverImage || null,
      releaseDate: gs.game.releaseDate ? gs.game.releaseDate.toISOString() : null,
      viewCount: gs.game.viewCount,
      favoriteCount: gs.game.favoriteCount,
    })),
  }))

  return { studios: items, total, totalPages: Math.max(1, Math.ceil(total / size)), page: pageNum }
}
