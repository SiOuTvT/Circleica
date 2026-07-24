import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { PAGINATION } from "@/lib/config"

/**
 * Galvelica 数据层 — 同人视觉小说资料库
 * ───────────────────────────────────────────────────────────
 * 不引入新表：Galvelica 是建立在现有 `Game` 之上的「策展 / 档案馆」视图层。
 * 所有查询都基于 isPublished 的 Game 记录，复用 tags / creators / studioName /
 * releaseDate 等既有字段，未来扩展（社团档案 / 作者 / 系列 / 时间轴）只需在
 * 此层追加查询函数，页面与组件无需改动。
 */

const GAL_CACHE_TTL = 1800 // 30 分钟

/* ── 类型 ─────────────────────────────────────────────── */

export interface GalvelicaTag {
  id: string
  name: string
  color: string
  groupName?: string | null
  groupColor?: string | null
  count?: number
}

export interface GalvelicaWorkCard {
  id: string
  serialId: number
  title: string
  originalWork: string
  coverImage: string
  studioName: string
  releaseYear: number | null
  favoriteCount: number
  viewCount: number
  isNsfw: boolean
  tags: GalvelicaTag[]
  /** 纯文本简介（由 description 脱标签后截断，供杂志式卡片一句简介） */
  description: string
}

export interface GalvelicaWorkDetail extends GalvelicaWorkCard {
  englishName: string
  aliases: string
  description: string
  status: string
  gameDuration: string
  vndbId: string
  releaseDate: string | null
  ratingAvg: number | null
  ratingCount: number
  /** 制作人员（含角色） */
  staff: { id: string; name: string; nameJa: string; role: string }[]
  /** 同系列 / 同社团的其它作品（轻量） */
  siblings: { id: string; serialId: number; title: string; coverImage: string }[]
}

export interface GalvelicaListResult {
  items: GalvelicaWorkCard[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type GalvelicaSort = "recent" | "popular" | "views" | "title" | "year"

export interface GalvelicaListQuery {
  tags?: string[] // tag id，AND 组合
  year?: number
  studio?: string // 解码后的 studioName
  search?: string
  sort?: GalvelicaSort
  page?: number
  pageSize?: number
}

/* ── 通用 select / where ─────────────────────────────── */

function workCardSelect() {
  return {
    id: true,
    serialId: true,
    title: true,
    originalWork: true,
    coverImage: true,
    studioName: true,
    releaseDate: true,
    publishedAt: true,
    favoriteCount: true,
    viewCount: true,
    isNsfw: true,
    description: true,
    tags: {
      select: {
        tag: {
          select: {
            id: true,
            name: true,
            color: true,
            group: { select: { name: true, color: true } },
          },
        },
      },
    },
  } satisfies Prisma.GameSelect
}

/** 把富文本 description 脱标签并折叠空白，得到纯文本（用于卡片一句简介） */
function stripHtml(input: unknown): string {
  if (typeof input !== "string" || !input) return ""
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function mapCard(g: any): GalvelicaWorkCard {
  const year = g.releaseDate ? g.releaseDate.getFullYear() : g.publishedAt ? g.publishedAt.getFullYear() : null
  return {
    id: g.id,
    serialId: g.serialId,
    title: g.title,
    originalWork: g.originalWork,
    coverImage: g.coverImage,
    studioName: g.studioName,
    releaseYear: year,
    favoriteCount: g.favoriteCount,
    viewCount: g.viewCount,
    isNsfw: g.isNsfw,
    description: stripHtml(g.description).slice(0, 100),
    tags: (g.tags ?? []).map((t: any) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color,
      groupName: t.tag.group?.name ?? null,
      groupColor: t.tag.group?.color ?? null,
    })),
  }
}

function publishedWhere(q: GalvelicaListQuery): Prisma.GameWhereInput {
  const and: Prisma.GameWhereInput[] = [{ isPublished: true }]

  if (q.tags && q.tags.length > 0) {
    and.push(...q.tags.map((tagId) => ({ tags: { some: { tagId } } })))
  }
  if (typeof q.year === "number" && !Number.isNaN(q.year)) {
    const from = new Date(q.year, 0, 1)
    const to = new Date(q.year + 1, 0, 1)
    and.push({
      OR: [
        { releaseDate: { gte: from, lt: to } },
        { releaseDate: null, publishedAt: { gte: from, lt: to } },
      ],
    })
  }
  if (q.studio) {
    and.push({ studioName: q.studio })
  }
  if (q.search && q.search.trim()) {
    const s = q.search.trim()
    and.push({
      OR: [
        { title: { contains: s, mode: "insensitive" } },
        { originalWork: { contains: s, mode: "insensitive" } },
        { studioName: { contains: s, mode: "insensitive" } },
        { aliases: { contains: s, mode: "insensitive" } },
      ],
    })
  }
  return { AND: and }
}

function sortToOrderBy(sort: GalvelicaSort): Prisma.GameOrderByWithRelationInput {
  switch (sort) {
    case "popular":
      return { favoriteCount: "desc" }
    case "views":
      return { viewCount: "desc" }
    case "title":
      return { title: "asc" }
    case "year":
      return { releaseDate: "desc" }
    case "recent":
    default:
      return { createdAt: "desc" }
  }
}

/* ── 浏览 / 列表 ─────────────────────────────────────── */

export async function listWorks(query: GalvelicaListQuery): Promise<GalvelicaListResult> {
  const page = Math.max(1, query.page ?? PAGINATION.DEFAULT_PAGE)
  const pageSize = Math.min(PAGINATION.MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE))
  const where = publishedWhere(query)

  const [total, rows] = await Promise.all([
    prisma.game.count({ where }),
    prisma.game.findMany({
      where,
      select: workCardSelect(),
      orderBy: sortToOrderBy(query.sort ?? "recent"),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    items: rows.map(mapCard),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

/* ── 作品档案详情 ───────────────────────────────────── */

export async function getWorkBySerialId(serialId: number): Promise<GalvelicaWorkDetail | null> {
  if (!serialId || serialId <= 0) return null
  const g = await prisma.game.findFirst({
    where: { serialId, isPublished: true },
    include: {
      tags: { select: { tag: { select: { id: true, name: true, color: true, group: { select: { name: true, color: true } } } } } },
      creators: { include: { creator: { select: { id: true, name: true, nameJa: true } } } },
      ratings: { select: { score: true } },
    },
  })
  if (!g) return null

  const tagNames = g.tags.map((t) => t.tag.name)
  const year = g.releaseDate ? g.releaseDate.getFullYear() : g.publishedAt ? g.publishedAt.getFullYear() : null

  const siblings = tagNames.length
    ? await prisma.game.findMany({
        where: { id: { not: g.id }, isPublished: true, tags: { some: { tag: { name: { in: tagNames } } } } },
        select: { id: true, serialId: true, title: true, coverImage: true },
        orderBy: { favoriteCount: "desc" },
        take: 6,
      })
    : []

  // 评分均值（直接由已加载的 ratings 计算，避免额外查询）
  const scores = g.ratings.map((r) => r.score)
  const ratingAvg = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null

  const card = mapCard(g)
  return {
    ...card,
    releaseYear: year,
    englishName: g.englishName,
    aliases: g.aliases,
    description: g.description,
    status: g.status,
    gameDuration: g.gameDuration,
    vndbId: g.vndbId,
    releaseDate: g.releaseDate ? g.releaseDate.toISOString() : null,
    ratingAvg,
    ratingCount: scores.length,
    staff: g.creators.map((c) => ({
      id: c.creator.id,
      name: c.creator.name,
      nameJa: c.creator.nameJa,
      role: c.role,
    })),
    siblings: siblings.map((s) => ({ id: s.id, serialId: s.serialId, title: s.title, coverImage: s.coverImage })),
  }
}

/* ── 相关 / 相似作品 ─────────────────────────────────── */

export async function getRelatedWorks(id: string, tagNames: string[], limit = 8): Promise<GalvelicaWorkCard[]> {
  if (!tagNames.length) return []
  const rows = await prisma.game.findMany({
    where: { id: { not: id }, isPublished: true, tags: { some: { tag: { name: { in: tagNames } } } } },
    select: workCardSelect(),
    orderBy: { favoriteCount: "desc" },
    take: limit,
  })
  return rows.map(mapCard)
}

/* ── 热门标签（含计数）─────────────────────────────── */

export async function getPopularTags(limit = 28): Promise<GalvelicaTag[]> {
  const key = cacheKey("galvelica", "popular-tags", String(limit))
  const cached = await cache.get<GalvelicaTag[]>(key)
  if (cached) return cached

  const rows = await prisma.tag.findMany({
    where: { isVisible: true, games: { some: { game: { isPublished: true } } } },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { games: true } } },
    orderBy: { sortOrder: "desc" },
    take: 200,
  })
  const tags: GalvelicaTag[] = rows
    .map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      groupName: t.group?.name ?? null,
      groupColor: t.group?.color ?? null,
      count: t._count.games,
    }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, limit)
  await cache.set(key, tags, GAL_CACHE_TTL)
  return tags
}

/* ── 年份索引（含计数）─────────────────────────────── */

export async function getYears(): Promise<{ year: number; count: number }[]> {
  const key = cacheKey("galvelica", "years")
  const cached = await cache.get<{ year: number; count: number }[]>(key)
  if (cached) return cached

  const rows = await prisma.game.findMany({
    where: { isPublished: true },
    select: { releaseDate: true, publishedAt: true },
  })
  const map = new Map<number, number>()
  for (const r of rows) {
    const y = r.releaseDate ? r.releaseDate.getFullYear() : r.publishedAt ? r.publishedAt.getFullYear() : null
    if (y) map.set(y, (map.get(y) ?? 0) + 1)
  }
  const years = [...map.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year)
  await cache.set(key, years, GAL_CACHE_TTL)
  return years
}

/* ── 社团索引（含计数）─────────────────────────────── */

export async function getStudios(): Promise<{ name: string; count: number }[]> {
  const key = cacheKey("galvelica", "studios")
  const cached = await cache.get<{ name: string; count: number }[]>(key)
  if (cached) return cached

  const rows = await prisma.game.findMany({
    where: { isPublished: true, NOT: { studioName: "" } },
    select: { studioName: true },
  })
  const map = new Map<string, number>()
  for (const r of rows) {
    if (!r.studioName) continue
    map.set(r.studioName, (map.get(r.studioName) ?? 0) + 1)
  }
  const studios = [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hans-CN"))
  await cache.set(key, studios, GAL_CACHE_TTL)
  return studios
}

/* ── 最近收录 ──────────────────────────────────────── */

export async function getRecentWorks(limit = 10): Promise<GalvelicaWorkCard[]> {
  const key = cacheKey("galvelica", "recent", String(limit))
  const cached = await cache.get<GalvelicaWorkCard[]>(key)
  if (cached) return cached

  const rows = await prisma.game.findMany({
    where: { isPublished: true },
    select: workCardSelect(),
    orderBy: { createdAt: "desc" },
    take: limit,
  })
  const items = rows.map(mapCard)
  await cache.set(key, items, GAL_CACHE_TTL)
  return items
}

/* ── 编辑推荐（策展就绪）────────────────────────────
 * 若管理员建立了名为含 "Galvelica" 的已发布精选合集，则采用其作品；
 * 否则回退到收藏数最高的作品。扩展点清晰，无需改动页面。
 */
export async function getEditorPicks(limit = 8): Promise<GalvelicaWorkCard[]> {
  const key = cacheKey("galvelica", "editor-picks", String(limit))
  const cached = await cache.get<GalvelicaWorkCard[]>(key)
  if (cached) return cached

  let items: GalvelicaWorkCard[] = []
  try {
    const collection = await prisma.curatedCollection.findFirst({
      where: { published: true, name: { contains: "Galvelica", mode: "insensitive" } },
      include: {
        games: {
          where: { game: { isPublished: true } },
          orderBy: { sortOrder: "asc" },
          take: limit,
          select: { game: { select: workCardSelect() } },
        },
      },
    })
    if (collection && collection.games.length) {
      items = collection.games.map((cg) => mapCard(cg.game))
    }
  } catch (err) {
    logger.api.warn("[galvelica:getEditorPicks] curated collection lookup failed, fallback", { error: String(err) })
  }

  if (!items.length) {
    const rows = await prisma.game.findMany({
      where: { isPublished: true },
      select: workCardSelect(),
      orderBy: { favoriteCount: "desc" },
      take: limit,
    })
    items = rows.map(mapCard)
  }
  await cache.set(key, items, GAL_CACHE_TTL)
  return items
}

/* ── 随机发现（返回 serialId）──────────────────────── */

export async function getRandomWorkSerialId(): Promise<number | null> {
  const count = await prisma.game.count({ where: { isPublished: true } })
  if (!count) return null
  const skip = Math.floor(Math.random() * count)
  const g = await prisma.game.findFirst({
    where: { isPublished: true },
    select: { serialId: true },
    skip,
    take: 1,
  })
  return g?.serialId ?? null
}

/* ── 单标签查询（用于标签详情页标题）────────────────── */
export async function getTagById(tagId: string): Promise<GalvelicaTag | null> {
  const t = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { games: true } } },
  })
  if (!t) return null
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    groupName: t.group?.name ?? null,
    groupColor: t.group?.color ?? null,
    count: t._count.games,
  }
}

/* ── 本馆札记 / 专题策划 / 今日缘分 所需数据 ────────── */

function dateKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** 按日期确定性抽取一部作品（今日缘分）。同一天结果稳定，跨天变化。 */
export async function getDailyPick(): Promise<GalvelicaWorkCard | null> {
  const key = cacheKey("galvelica", "daily-pick", dateKeyOf(new Date()))
  const cached = await cache.get<GalvelicaWorkCard | null>(key)
  if (cached) return cached

  const count = await prisma.game.count({ where: { isPublished: true } })
  if (!count) {
    await cache.set(key, null, GAL_CACHE_TTL)
    return null
  }
  const idx = hashString(dateKeyOf(new Date())) % count
  const g = await prisma.game.findFirst({
    where: { isPublished: true },
    select: workCardSelect(),
    orderBy: { serialId: "asc" },
    skip: idx,
    take: 1,
  })
  const item = g ? mapCard(g) : null
  await cache.set(key, item, GAL_CACHE_TTL)
  return item
}

/** 按名称解析标签（专题链接构造用） */
export async function getTagByName(name: string): Promise<GalvelicaTag | null> {
  const t = await prisma.tag.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, isVisible: true },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { games: true } } },
  })
  if (!t) return null
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    groupName: t.group?.name ?? null,
    groupColor: t.group?.color ?? null,
    count: t._count.games,
  }
}

export interface FeaturedTheme {
  key: string
  kicker: string
  title: string
  blurb: string
  tagId: string
  tagName: string
  href: string
}

/** 编辑视角的专题策划——链接到真实的标签筛选视图，而非机械的标签云堆叠 */
const THEME_DEFS: { key: string; kicker: string; title: string; blurb: string; tagName: string }[] = [
  {
    key: "love",
    kicker: "专栏 01",
    title: "恋爱物语",
    blurb: "青涩、纠结与心动，同人创作者最钟情的题材之一。",
    tagName: "恋爱",
  },
  {
    key: "multiline",
    kicker: "专栏 02",
    title: "多线叙事",
    blurb: "分支、选择与多重结局——结构本身即是乐趣。",
    tagName: "多结局",
  },
  {
    key: "adv",
    kicker: "专栏 03",
    title: "ADV 巡礼",
    blurb: "文字冒险的原点与流变，从一部经典读起。",
    tagName: "ADV",
  },
]

export async function getFeaturedThemes(): Promise<FeaturedTheme[]> {
  const key = cacheKey("galvelica", "featured-themes")
  const cached = await cache.get<FeaturedTheme[]>(key)
  if (cached) return cached

  const themes: FeaturedTheme[] = []
  for (const def of THEME_DEFS) {
    const tag = await getTagByName(def.tagName)
    if (!tag) continue
    themes.push({
      ...def,
      tagId: tag.id,
      tagName: tag.name,
      href: `/galvelica/works?tags=${encodeURIComponent(tag.id)}`,
    })
  }
  await cache.set(key, themes, GAL_CACHE_TTL)
  return themes
}
