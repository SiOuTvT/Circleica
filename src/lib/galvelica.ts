import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { PAGINATION } from "@/lib/config"

/**
 * Galvelica 数据层 — 同人视觉小说资料库（Stage F：改为读取独立 Work 档案）
 * ───────────────────────────────────────────────────────────
 * 历史：本文件早期是建立在 `Game` 之上的「策展视图层」。Stage A/B/C 落地后，
 * Galvelica 拥有独立的 `Work` 档案 + 多源字段级融合（`WorkSource` / 融合引擎）。
 * 本文件现改为 **优先读取 `Work`**（资料库可大于 Circleica、含未收录作品）；
 * 若尚未回填（Work 表为空），自动回退到旧 `Game` 实现，保证站点平滑过渡、不空窗。
 *
 * 对外公开类型与函数签名保持不变，Galvelica 页面与组件无需改动。
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
  /** 详情页链接：已收录→/galvelica/works/<serialId>，未收录→/galvelica/works/<slug> */
  href: string
  slug: string
  title: string
  originalWork: string
  coverImage: string
  studioName: string
  releaseYear: number | null
  favoriteCount: number
  viewCount: number
  isNsfw: boolean
  tags: GalvelicaTag[]
  /** 同人分类：PURE=纯正同人，DERIVATIVE=同人系公司商业作，null=未定 */
  doujinCategory: "PURE" | "DERIVATIVE" | null
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
  /** 同系列 / 同社团的其它作品（轻量），带 href 以支持未收录作品 */
  siblings: { id: string; serialId: number; title: string; coverImage: string; href: string }[]
  /** 是否已收录进 Circleica（有对应 Game） */
  included: boolean
  gameId: string | null
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

export interface FeaturedTheme {
  key: string
  kicker: string
  title: string
  blurb: string
  tagId: string
  tagName: string
  href: string
}

/* ── 归档就绪判定（一次性缓存） ───────────────────── */

let _archiveReady: boolean | null = null
async function archiveReady(): Promise<boolean> {
  if (_archiveReady === null) {
    try {
      _archiveReady = (await prisma.work.count()) > 0
    } catch {
      _archiveReady = false
    }
  }
  return _archiveReady
}

/* ── 工具 ───────────────────────────────────────────── */

/** 把富文本 description 脱标签并折叠空白，得到纯文本（用于卡片一句简介） */
function stripHtml(input: unknown): string {
  if (typeof input !== "string" || !input) return ""
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

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

function cardHref(gameId: string | null, serialId: number | null, slug: string): string {
  if (gameId && serialId) return `/galvelica/works/${serialId}`
  return `/galvelica/works/${slug}`
}

/* =========================================================================
 *  Work 实现（Stage F 主路径）
 * ========================================================================= */

interface WorkCardSource {
  id: string
  slug: string
  gameId: string | null
  title: string
  originalWork: string
  coverImage: string
  studioName: string | null
  releaseDate: Date | null
  favoriteCount: number
  viewCount: number
  isNsfw: boolean
  description: string
  doujinCategory: "PURE" | "DERIVATIVE" | null
  game: { serialId: number } | null
  tags: { tag: { id: string; name: string; color: string | null; group?: { name: string | null; color: string | null } | null } }[]
}

function workCardSelect() {
  return {
    id: true,
    slug: true,
    gameId: true,
    title: true,
    originalWork: true,
    coverImage: true,
    studioName: true,
    releaseDate: true,
    favoriteCount: true,
    viewCount: true,
    isNsfw: true,
    description: true,
    doujinCategory: true,
    game: { select: { serialId: true } },
    tags: {
      select: {
        tag: {
          select: { id: true, name: true, color: true, group: { select: { name: true, color: true } } },
        },
      },
    },
  } satisfies Prisma.WorkSelect
}

function mapWorkCard(w: WorkCardSource): GalvelicaWorkCard {
  const year = w.releaseDate ? w.releaseDate.getFullYear() : null
  return {
    id: w.id,
    serialId: w.game?.serialId ?? 0,
    href: cardHref(w.gameId, w.game?.serialId ?? null, w.slug),
    slug: w.slug,
    title: w.title,
    originalWork: w.originalWork,
    coverImage: w.coverImage,
    studioName: w.studioName ?? "",
    releaseYear: year,
    favoriteCount: w.favoriteCount,
    viewCount: w.viewCount,
    isNsfw: w.isNsfw,
    doujinCategory: w.doujinCategory ?? null,
    description: stripHtml(w.description).slice(0, 100),
    tags: (w.tags ?? []).map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color ?? "",
      groupName: t.tag.group?.name ?? "",
      groupColor: t.tag.group?.color ?? "",
    })),
  }
}

function workWhere(q: GalvelicaListQuery): Prisma.WorkWhereInput {
  const and: Prisma.WorkWhereInput[] = []
  if (q.tags && q.tags.length > 0) {
    and.push(...q.tags.map((tagId) => ({ tags: { some: { tagId } } })))
  }
  if (typeof q.year === "number" && !Number.isNaN(q.year)) {
    const from = new Date(q.year, 0, 1)
    const to = new Date(q.year + 1, 0, 1)
    and.push({ releaseDate: { gte: from, lt: to } })
  }
  if (q.studio) and.push({ studioName: q.studio })
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
  return and.length ? { AND: and } : {}
}

function workSortToOrderBy(sort: GalvelicaSort): Prisma.WorkOrderByWithRelationInput {
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

export async function listWorks(query: GalvelicaListQuery): Promise<GalvelicaListResult> {
  if (!(await archiveReady())) return listWorksFromGame(query)
  const page = Math.max(1, query.page ?? PAGINATION.DEFAULT_PAGE)
  const pageSize = Math.min(PAGINATION.MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE))
  const where = workWhere(query)

  const [total, rows] = await Promise.all([
    prisma.work.count({ where }),
    prisma.work.findMany({
      where,
      select: workCardSelect(),
      orderBy: workSortToOrderBy(query.sort ?? "recent"),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    items: rows.map(mapWorkCard),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function getWorkBySerialId(serialId: number): Promise<GalvelicaWorkDetail | null> {
  if (!serialId || serialId <= 0) return null
  if (!(await archiveReady())) return getWorkBySerialIdFromGame(serialId)

  const game = await prisma.game.findFirst({
    where: { serialId, isPublished: true },
    select: { id: true, galvelicaWork: { select: { id: true } } },
  })
  if (game?.galvelicaWork) {
    return buildDetailFromWork(game.galvelicaWork.id, game.id)
  }
  // 归档已就绪但该 Game 尚未建 Work（极端情况）→ 回退 Game 实现
  return getWorkBySerialIdFromGame(serialId)
}

export async function getWorkBySlug(slug: string): Promise<GalvelicaWorkDetail | null> {
  if (!(await archiveReady())) return null
  const work = await prisma.work.findUnique({ where: { slug }, select: { id: true } })
  if (!work) return null
  return buildDetailFromWork(work.id, null)
}

async function buildDetailFromWork(workId: string, fallbackGameId: string | null): Promise<GalvelicaWorkDetail | null> {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: {
      game: { select: { serialId: true } },
      sources: { select: { source: true, externalId: true } },
      tags: { select: { tag: { select: { id: true, name: true, color: true, group: { select: { name: true, color: true } } } } } },
      creators: { include: { creator: { select: { id: true, name: true, nameJa: true } } } },
    },
  })
  if (!work) return null

  const vndbSource = work.sources.find((s) => s.source === "VNDB")
  const vndbId = vndbSource?.externalId ?? ""
  const gameId = work.gameId ?? fallbackGameId
  const serialId = work.game?.serialId ?? 0
  const href = cardHref(gameId, serialId || null, work.slug)

  const tagNames = work.tags.map((t) => t.tag.name)
  const siblings = tagNames.length
    ? await prisma.work.findMany({
        where: { id: { not: work.id }, tags: { some: { tag: { name: { in: tagNames } } } } },
        select: workCardSelect(),
        orderBy: { favoriteCount: "desc" },
        take: 6,
      })
    : []

  const year = work.releaseDate ? work.releaseDate.getFullYear() : null
  const card = mapWorkCard(work as unknown as WorkCardSource)

  return {
    ...card,
    href,
    slug: work.slug,
    gameId: work.gameId,
    included: !!gameId,
    releaseYear: year,
    englishName: work.englishName,
    aliases: work.aliases,
    description: work.description,
    status: work.status,
    gameDuration: work.duration,
    vndbId,
    releaseDate: work.releaseDate ? work.releaseDate.toISOString() : null,
    ratingAvg: work.ratingAvg,
    ratingCount: work.ratingCount,
    staff: work.creators.map((c) => ({
      id: c.creator.id,
      name: c.creator.name,
      nameJa: c.creator.nameJa,
      role: c.role,
    })),
    siblings: siblings.map((s) => {
      const sc = mapWorkCard(s as unknown as WorkCardSource)
      return { id: s.id, serialId: sc.serialId, title: s.title, coverImage: s.coverImage, href: sc.href }
    }),
  }
}

export async function getRelatedWorks(id: string, tagNames: string[], limit = 8): Promise<GalvelicaWorkCard[]> {
  if (!(await archiveReady())) return getRelatedWorksFromGame(id, tagNames, limit)
  if (!tagNames.length) return []
  const rows = await prisma.work.findMany({
    where: { id: { not: id }, tags: { some: { tag: { name: { in: tagNames } } } } },
    select: workCardSelect(),
    orderBy: { favoriteCount: "desc" },
    take: limit,
  })
  return rows.map(mapWorkCard)
}

export async function getPopularTags(limit = 28): Promise<GalvelicaTag[]> {
  if (!(await archiveReady())) return getPopularTagsFromGame(limit)
  const key = cacheKey("galvelica", "popular-tags", String(limit))
  const cached = await cache.get<GalvelicaTag[]>(key)
  if (cached) return cached

  const rows = await prisma.tag.findMany({
    where: { works: { some: {} } },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { works: true } } },
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
      count: t._count.works,
    }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, limit)
  await cache.set(key, tags, GAL_CACHE_TTL)
  return tags
}

export async function getYears(): Promise<{ year: number; count: number }[]> {
  if (!(await archiveReady())) return getYearsFromGame()
  const key = cacheKey("galvelica", "years")
  const cached = await cache.get<{ year: number; count: number }[]>(key)
  if (cached) return cached

  const rows = await prisma.work.findMany({ where: { NOT: { releaseDate: null } }, select: { releaseDate: true } })
  const map = new Map<number, number>()
  for (const r of rows) {
    if (!r.releaseDate) continue
    const y = r.releaseDate.getFullYear()
    map.set(y, (map.get(y) ?? 0) + 1)
  }
  const years = [...map.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year)
  await cache.set(key, years, GAL_CACHE_TTL)
  return years
}

export async function getStudios(): Promise<{ name: string; count: number }[]> {
  if (!(await archiveReady())) return getStudiosFromGame()
  const key = cacheKey("galvelica", "studios")
  const cached = await cache.get<{ name: string; count: number }[]>(key)
  if (cached) return cached

  const rows = await prisma.work.findMany({ where: { NOT: { studioName: "" } }, select: { studioName: true } })
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

export async function getRecentWorks(limit = 10): Promise<GalvelicaWorkCard[]> {
  if (!(await archiveReady())) return getRecentWorksFromGame(limit)
  const key = cacheKey("galvelica", "recent", String(limit))
  const cached = await cache.get<GalvelicaWorkCard[]>(key)
  if (cached) return cached
  const rows = await prisma.work.findMany({ select: workCardSelect(), orderBy: { createdAt: "desc" }, take: limit })
  const items = rows.map(mapWorkCard)
  await cache.set(key, items, GAL_CACHE_TTL)
  return items
}

export async function getEditorPicks(limit = 8): Promise<GalvelicaWorkCard[]> {
  if (!(await archiveReady())) return getEditorPicksFromGame(limit)
  const key = cacheKey("galvelica", "editor-picks", String(limit))
  const cached = await cache.get<GalvelicaWorkCard[]>(key)
  if (cached) return cached

  let items: GalvelicaWorkCard[] = []
  try {
    const collection = await prisma.curatedCollection.findFirst({
      where: { published: true, name: { contains: "Galvelica", mode: "insensitive" } },
      include: {
        games: {
          where: { game: { galvelicaWork: { is: {} } } },
          orderBy: { sortOrder: "asc" },
          take: limit,
          select: { game: { select: { galvelicaWork: { select: { id: true } } } } },
        },
      },
    })
    if (collection) {
      const workIds = collection.games.map((cg) => cg.game.galvelicaWork?.id).filter(Boolean) as string[]
      if (workIds.length) {
        const works = await prisma.work.findMany({ where: { id: { in: workIds } }, select: workCardSelect() })
        items = works.map(mapWorkCard)
      }
    }
  } catch (err) {
    logger.api.warn("[galvelica:getEditorPicks] curated collection lookup failed, fallback", { error: String(err) })
  }

  if (!items.length) {
    const rows = await prisma.work.findMany({ select: workCardSelect(), orderBy: { favoriteCount: "desc" }, take: limit })
    items = rows.map(mapWorkCard)
  }
  await cache.set(key, items, GAL_CACHE_TTL)
  return items
}

export async function getRandomWorkSerialId(): Promise<number | null> {
  if (!(await archiveReady())) return getRandomWorkSerialIdFromGame()
  const count = await prisma.work.count({ where: { NOT: { gameId: null } } })
  if (!count) return null
  const skip = Math.floor(Math.random() * count)
  const w = await prisma.work.findFirst({
    where: { NOT: { gameId: null } },
    select: { game: { select: { serialId: true } } },
    orderBy: { createdAt: "asc" },
    skip,
    take: 1,
  })
  return w?.game?.serialId ?? null
}

export async function getTagById(tagId: string): Promise<GalvelicaTag | null> {
  if (!(await archiveReady())) return getTagByIdFromGame(tagId)
  const t = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { works: true } } },
  })
  if (!t) return null
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    groupName: t.group?.name ?? null,
    groupColor: t.group?.color ?? null,
    count: t._count.works,
  }
}

export async function getDailyPick(): Promise<GalvelicaWorkCard | null> {
  if (!(await archiveReady())) return getDailyPickFromGame()
  const key = cacheKey("galvelica", "daily-pick", dateKeyOf(new Date()))
  const cached = await cache.get<GalvelicaWorkCard | null>(key)
  if (cached) return cached

  const count = await prisma.work.count()
  if (!count) {
    await cache.set(key, null, GAL_CACHE_TTL)
    return null
  }
  const idx = hashString(dateKeyOf(new Date())) % count
  const w = await prisma.work.findFirst({ select: workCardSelect(), orderBy: { createdAt: "asc" }, skip: idx, take: 1 })
  const item = w ? mapWorkCard(w as unknown as WorkCardSource) : null
  await cache.set(key, item, GAL_CACHE_TTL)
  return item
}

export async function getTagByName(name: string): Promise<GalvelicaTag | null> {
  if (!(await archiveReady())) return getTagByNameFromGame(name)
  const t = await prisma.tag.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, isVisible: true },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { works: true } } },
  })
  if (!t) return null
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    groupName: t.group?.name ?? null,
    groupColor: t.group?.color ?? null,
    count: t._count.works,
  }
}

const THEME_DEFS: { key: string; kicker: string; title: string; blurb: string; tagName: string }[] = [
  { key: "love", kicker: "专栏 01", title: "恋爱物语", blurb: "青涩、纠结与心动，同人创作者最钟情的题材之一。", tagName: "恋爱" },
  { key: "multiline", kicker: "专栏 02", title: "多线叙事", blurb: "分支、选择与多重结局——结构本身即是乐趣。", tagName: "多结局" },
  { key: "adv", kicker: "专栏 03", title: "ADV 巡礼", blurb: "文字冒险的原点与流变，从一部经典读起。", tagName: "ADV" },
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

/* =========================================================================
 *  旧 Game 实现（回退路径：Work 表尚未回填时使用）
 * ========================================================================= */

interface GalvelicaCardSource {
  id: string
  serialId: number
  title: string
  originalWork?: string | null
  coverImage?: string | null
  studioName?: string | null
  releaseDate?: Date | null
  publishedAt?: Date | null
  favoriteCount: number
  viewCount: number
  isNsfw: boolean
  description?: string | null
  tags?: { tag: { id: string; name: string; color: string | null; group?: { name: string | null; color: string | null } | null } }[]
}

function workCardSelectGame() {
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
          select: { id: true, name: true, color: true, group: { select: { name: true, color: true } } },
        },
      },
    },
  } satisfies Prisma.GameSelect
}

function mapCardGame(g: GalvelicaCardSource): GalvelicaWorkCard {
  const year = g.releaseDate ? g.releaseDate.getFullYear() : g.publishedAt ? g.publishedAt.getFullYear() : null
  return {
    id: g.id,
    serialId: g.serialId,
    href: `/galvelica/works/${g.serialId}`,
    slug: `g${g.serialId}`,
    title: g.title,
    originalWork: g.originalWork ?? "",
    coverImage: g.coverImage ?? "",
    studioName: g.studioName ?? "",
    releaseYear: year,
    favoriteCount: g.favoriteCount,
    viewCount: g.viewCount,
    isNsfw: g.isNsfw,
    doujinCategory: null,
    description: stripHtml(g.description).slice(0, 100),
    tags: (g.tags ?? []).map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      color: t.tag.color ?? "",
      groupName: t.tag.group?.name ?? "",
      groupColor: t.tag.group?.color ?? "",
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
  if (q.studio) and.push({ studioName: q.studio })
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

function sortToOrderByGame(sort: GalvelicaSort): Prisma.GameOrderByWithRelationInput {
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

async function listWorksFromGame(query: GalvelicaListQuery): Promise<GalvelicaListResult> {
  const page = Math.max(1, query.page ?? PAGINATION.DEFAULT_PAGE)
  const pageSize = Math.min(PAGINATION.MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE))
  const where = publishedWhere(query)
  const [total, rows] = await Promise.all([
    prisma.game.count({ where }),
    prisma.game.findMany({
      where,
      select: workCardSelectGame(),
      orderBy: sortToOrderByGame(query.sort ?? "recent"),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return { items: rows.map(mapCardGame), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

async function getWorkBySerialIdFromGame(serialId: number): Promise<GalvelicaWorkDetail | null> {
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
  const scores = g.ratings.map((r) => r.score)
  const ratingAvg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null

  const card = mapCardGame(g)
  const serialIdVal = g.serialId
  return {
    ...card,
    href: `/galvelica/works/${serialIdVal}`,
    slug: `g${serialIdVal}`,
    gameId: g.id,
    included: true,
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
    staff: g.creators.map((c) => ({ id: c.creator.id, name: c.creator.name, nameJa: c.creator.nameJa, role: c.role })),
    siblings: siblings.map((s) => ({ id: s.id, serialId: s.serialId, title: s.title, coverImage: s.coverImage, href: `/galvelica/works/${s.serialId}` })),
  }
}

async function getRelatedWorksFromGame(id: string, tagNames: string[], limit = 8): Promise<GalvelicaWorkCard[]> {
  if (!tagNames.length) return []
  const rows = await prisma.game.findMany({
    where: { id: { not: id }, isPublished: true, tags: { some: { tag: { name: { in: tagNames } } } } },
    select: workCardSelectGame(),
    orderBy: { favoriteCount: "desc" },
    take: limit,
  })
  return rows.map(mapCardGame)
}

async function getPopularTagsFromGame(limit = 28): Promise<GalvelicaTag[]> {
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
    .map((t) => ({ id: t.id, name: t.name, color: t.color, groupName: t.group?.name ?? null, groupColor: t.group?.color ?? null, count: t._count.games }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, limit)
  await cache.set(key, tags, GAL_CACHE_TTL)
  return tags
}

async function getYearsFromGame(): Promise<{ year: number; count: number }[]> {
  const key = cacheKey("galvelica", "years")
  const cached = await cache.get<{ year: number; count: number }[]>(key)
  if (cached) return cached
  const rows = await prisma.game.findMany({ where: { isPublished: true }, select: { releaseDate: true, publishedAt: true } })
  const map = new Map<number, number>()
  for (const r of rows) {
    const y = r.releaseDate ? r.releaseDate.getFullYear() : r.publishedAt ? r.publishedAt.getFullYear() : null
    if (y) map.set(y, (map.get(y) ?? 0) + 1)
  }
  const years = [...map.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year)
  await cache.set(key, years, GAL_CACHE_TTL)
  return years
}

async function getStudiosFromGame(): Promise<{ name: string; count: number }[]> {
  const key = cacheKey("galvelica", "studios")
  const cached = await cache.get<{ name: string; count: number }[]>(key)
  if (cached) return cached
  const rows = await prisma.gameStudio.findMany({
    where: { game: { isPublished: true } },
    select: { studio: { select: { displayName: true } } },
  })
  const map = new Map<string, number>()
  for (const r of rows) {
    const name = r.studio.displayName
    if (!name) continue
    map.set(name, (map.get(name) ?? 0) + 1)
  }
  const studios = [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hans-CN"))
  await cache.set(key, studios, GAL_CACHE_TTL)
  return studios
}

async function getRecentWorksFromGame(limit = 10): Promise<GalvelicaWorkCard[]> {
  const key = cacheKey("galvelica", "recent", String(limit))
  const cached = await cache.get<GalvelicaWorkCard[]>(key)
  if (cached) return cached
  const rows = await prisma.game.findMany({ where: { isPublished: true }, select: workCardSelectGame(), orderBy: { createdAt: "desc" }, take: limit })
  const items = rows.map(mapCardGame)
  await cache.set(key, items, GAL_CACHE_TTL)
  return items
}

async function getEditorPicksFromGame(limit = 8): Promise<GalvelicaWorkCard[]> {
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
          select: { game: { select: workCardSelectGame() } },
        },
      },
    })
    if (collection && collection.games.length) items = collection.games.map((cg) => mapCardGame(cg.game))
  } catch (err) {
    logger.api.warn("[galvelica:getEditorPicks] curated collection lookup failed, fallback", { error: String(err) })
  }
  if (!items.length) {
    const rows = await prisma.game.findMany({ where: { isPublished: true }, select: workCardSelectGame(), orderBy: { favoriteCount: "desc" }, take: limit })
    items = rows.map(mapCardGame)
  }
  await cache.set(key, items, GAL_CACHE_TTL)
  return items
}

async function getRandomWorkSerialIdFromGame(): Promise<number | null> {
  const count = await prisma.game.count({ where: { isPublished: true } })
  if (!count) return null
  const skip = Math.floor(Math.random() * count)
  const g = await prisma.game.findFirst({ where: { isPublished: true }, select: { serialId: true }, skip, take: 1 })
  return g?.serialId ?? null
}

async function getTagByIdFromGame(tagId: string): Promise<GalvelicaTag | null> {
  const t = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { games: true } } },
  })
  if (!t) return null
  return { id: t.id, name: t.name, color: t.color, groupName: t.group?.name ?? null, groupColor: t.group?.color ?? null, count: t._count.games }
}

async function getDailyPickFromGame(): Promise<GalvelicaWorkCard | null> {
  const key = cacheKey("galvelica", "daily-pick", dateKeyOf(new Date()))
  const cached = await cache.get<GalvelicaWorkCard | null>(key)
  if (cached) return cached
  const count = await prisma.game.count({ where: { isPublished: true } })
  if (!count) {
    await cache.set(key, null, GAL_CACHE_TTL)
    return null
  }
  const idx = hashString(dateKeyOf(new Date())) % count
  const g = await prisma.game.findFirst({ where: { isPublished: true }, select: workCardSelectGame(), orderBy: { serialId: "asc" }, skip: idx, take: 1 })
  const item = g ? mapCardGame(g) : null
  await cache.set(key, item, GAL_CACHE_TTL)
  return item
}

async function getTagByNameFromGame(name: string): Promise<GalvelicaTag | null> {
  const t = await prisma.tag.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, isVisible: true },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { games: true } } },
  })
  if (!t) return null
  return { id: t.id, name: t.name, color: t.color, groupName: t.group?.name ?? null, groupColor: t.group?.color ?? null, count: t._count.games }
}
