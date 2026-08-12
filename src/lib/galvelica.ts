import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { auth } from "@/lib/auth"
import { PAGINATION } from "@/lib/config"
import { cookies } from "next/headers"

/**
 * 副站 NSFW 过滤模式（三段式）：只 SFW / 只 NSFW / 全部。
 * 读取 cookie `gal_nsfw`：sfw=只显示安全封面（默认） nsfw=只显示露骨封面 all=全部。
 * 兼容旧值："1"→all（旧"显示露骨"） "0"/缺省→sfw。
 * ⚠️ 登录要求：切换过滤需要登录（合规考量），未登录一律强制 sfw 模式。
 */
export type GalNsfwMode = "sfw" | "nsfw" | "all"

async function resolveNsfwMode(): Promise<GalNsfwMode> {
  try {
    // 服务端落地"切换需登录"：未登录一律强制 sfw（防手动改 cookie 绕过登录门槛）
    const session = await auth()
    if (!session?.user) return "sfw"
    const store = await cookies()
    const v = store.get("gal_nsfw")?.value
    if (v === "nsfw") return "nsfw"
    if (v === "all" || v === "1") return "all"
    return "sfw"
  } catch {
    return "sfw"
  }
}

/** 导出给页面缓存 key 使用：NSFW 过滤模式必须进缓存 key，否则共享缓存跨用户泄漏 */
export async function getNsfwMode(): Promise<GalNsfwMode> {
  return resolveNsfwMode()
}

/** 真人实拍/写实3D 过滤：cookie `gal_realfilter`（1=显示 / 缺省或0=隐藏）。默认隐藏（用户偏好：不喜欢真人 3D）。 */
async function showRealisticEnabled(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("gal_realfilter")?.value === "1"
  } catch {
    return false
  }
}

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
  /** 封面露骨度分级（VNDB image.sexual：0=安全 1=暗示 2=露骨；-1/undefined=未知）。NSFW 开关只管控这个。 */
  coverSexual: number | null
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
  /** 方案B：媒体/平台/语言（融合入库后展示） */
  screenshots: string[]
  /** 截图露骨度平行数组（与 screenshots 下标对齐；VNDB screenshots[].sexual，0/1/2，缺省 -1） */
  screenshotsSexual?: number[]
  platforms: string[]
  languages: string[]
  originalLanguage: string
  officialWebsite: string
}

export interface GalvelicaListResult {
  items: GalvelicaWorkCard[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type GalvelicaSort = "recommended" | "recent" | "popular" | "views" | "title" | "year"

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
  /** 主题所对应标签的颜色（用于首页专题策划 chip 与副站统一的取色渲染） */
  tagColor?: string | null
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
  coverSexual: number | null
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
    coverSexual: true,
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
    coverSexual: w.coverSexual ?? null,
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

/* ── NSFW 三段过滤（阶段：封面露骨度直接过滤游戏本体，不做"封面隐藏"占位）──────────
 *  - sfw 模式：只显示 SFW（coverSexual 0/1/未定级 -1），露骨(2)游戏直接不显示
 *  - nsfw 模式：只显示露骨(2)
 *  - all 模式：全部显示
 * 内容 R18（isNsfw）不参与此过滤（排序信号）。商业系列（isCommercial）一律排除（同人馆不变式）。
 */

/** NSFW 模式过滤条件（三段）：sfw 排除露骨(2) / nsfw 只留露骨(2) / all 不过滤。与 workWhere 同源，供首页各卡片查询复用 */
async function nsfwModeWhere(): Promise<Prisma.WorkWhereInput> {
  const mode = await resolveNsfwMode()
  if (mode === "sfw") return { NOT: { coverSexual: 2 } }
  if (mode === "nsfw") return { coverSexual: 2 }
  return {}
}

async function workWhere(q: GalvelicaListQuery): Promise<Prisma.WorkWhereInput> {
  const and: Prisma.WorkWhereInput[] = [
    // 同人资料馆不变式：商业系列作品一律不展示
    { isCommercial: false },
  ]
  // 真人实拍/写实3D：默认隐藏（可开关显示）
  if (!(await showRealisticEnabled())) {
    and.push({ NOT: { contentFlags: { has: "LIVE_ACTION" } } })
  }
  // NSFW 三段过滤（直接过滤游戏本体）
  and.push(await nsfwModeWhere())
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
    case "recommended":
      return { qualityScore: "desc" }
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
  const where = await workWhere(query)

  const [total, rows] = await Promise.all([
    prisma.work.count({ where }),
    prisma.work.findMany({
      where,
      select: workCardSelect(),
      orderBy: workSortToOrderBy(query.sort ?? "recommended"),
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
  const work = await prisma.work.findFirst({ where: { slug, isCommercial: false }, select: { id: true } })
  if (!work) return null
  return buildDetailFromWork(work.id, null)
}

async function buildDetailFromWork(workId: string, fallbackGameId: string | null): Promise<GalvelicaWorkDetail | null> {
  const work = await prisma.work.findFirst({
    where: { id: workId, isCommercial: false },
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
        where: { id: { not: work.id }, isCommercial: false, ...(await nsfwModeWhere()), tags: { some: { tag: { name: { in: tagNames } } } } },
        select: workCardSelect(),
        orderBy: { favoriteCount: "desc" },
        take: 6,
      })
    : []

  const year = work.releaseDate ? work.releaseDate.getFullYear() : null
  const card = mapWorkCard(work as unknown as WorkCardSource)

  // 截图露骨度平行数组（保留原始，三段过滤在列表层按 coverSexual 过滤，详情页展示全部）
  const rawShots = Array.isArray(work.screenshots) ? (work.screenshots as string[]) : []
  const rawShotSexual = Array.isArray(work.screenshotsSexual) ? (work.screenshotsSexual as number[]) : []
  const screenshots = rawShots
  return {
    ...card,
    href,
    slug: work.slug,
    gameId: work.gameId,
    included: !!gameId,
    releaseYear: year,
    coverSexual: work.coverSexual ?? null,
    englishName: work.englishName,
    aliases: work.aliases,
    description: work.description,
    status: work.status,
    gameDuration: work.duration,
    vndbId,
    releaseDate: work.releaseDate ? work.releaseDate.toISOString() : null,
    ratingAvg: work.ratingAvg,
    ratingCount: work.ratingCount,
    screenshots,
    screenshotsSexual: rawShotSexual,
    platforms: Array.isArray(work.platforms) ? (work.platforms as string[]) : [],
    languages: Array.isArray(work.languages) ? (work.languages as string[]) : [],
    originalLanguage: work.originalLanguage ?? "",
    officialWebsite: work.officialWebsite ?? "",
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
    where: { id: { not: id }, isCommercial: false, ...(await nsfwModeWhere()), tags: { some: { tag: { name: { in: tagNames } } } } },
    select: workCardSelect(),
    orderBy: { favoriteCount: "desc" },
    take: limit,
  })
  return rows.map(mapWorkCard)
}

export async function getPopularTags(limit = 300): Promise<GalvelicaTag[]> {
  // 副站标签必须只来自副站作品，绝不回退到主站标签（否则会把主站标签混进「其他」分组）
  if (!(await archiveReady())) return []
  const key = cacheKey("galvelica", "popular-tags", String(limit))
  const cached = await cache.get<GalvelicaTag[]>(key)
  if (cached) return cached

  const rows = await prisma.tag.findMany({
    // 只统计仍被「非商业同人作品」使用的标签（商业系列已从 WorkTag 清理，显式过滤双保险）
    where: { works: { some: { work: { isCommercial: false } } } },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { works: { where: { work: { isCommercial: false } } } } } },
    orderBy: { sortOrder: "desc" },
    take: 600,
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

  const rows = await prisma.work.findMany({ where: { NOT: { releaseDate: null }, isCommercial: false }, select: { releaseDate: true } })
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

  const rows = await prisma.work.findMany({ where: { NOT: { studioName: "" }, isCommercial: false }, select: { studioName: true } })
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
  const key = cacheKey("galvelica", "recent", await getNsfwMode(), String(limit))
  const cached = await cache.get<GalvelicaWorkCard[]>(key)
  if (cached) return cached
  const rows = await prisma.work.findMany({ where: { isCommercial: false, ...(await nsfwModeWhere()) }, select: workCardSelect(), orderBy: { createdAt: "desc" }, take: limit })
  const items = rows.map(mapWorkCard)
  await cache.set(key, items, GAL_CACHE_TTL)
  return items
}

export async function getEditorPicks(limit = 8): Promise<GalvelicaWorkCard[]> {
  if (!(await archiveReady())) return getEditorPicksFromGame(limit)
  const key = cacheKey("galvelica", "editor-picks", await getNsfwMode(), String(limit))
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
        const works = await prisma.work.findMany({ where: { id: { in: workIds }, isCommercial: false, ...(await nsfwModeWhere()) }, select: workCardSelect() })
        items = works.map(mapWorkCard)
      }
    }
  } catch (err) {
    logger.api.warn("[galvelica:getEditorPicks] curated collection lookup failed, fallback", { error: String(err) })
  }

  if (!items.length) {
    const rows = await prisma.work.findMany({ where: { isCommercial: false, ...(await nsfwModeWhere()) }, select: workCardSelect(), orderBy: { favoriteCount: "desc" }, take: limit })
    items = rows.map(mapWorkCard)
  }
  await cache.set(key, items, GAL_CACHE_TTL)
  return items
}

/** 按 id 列表取副站作品卡片（继续浏览用），保持传入顺序 */
export async function getWorksByIds(ids: string[]): Promise<GalvelicaWorkCard[]> {
  if (!ids.length) return []
  const works = await prisma.work.findMany({ where: { id: { in: ids } }, select: workCardSelect() })
  const map = new Map(works.map((w) => [w.id, mapWorkCard(w as unknown as WorkCardSource)]))
  return ids.map((id) => map.get(id)).filter(Boolean) as GalvelicaWorkCard[]
}

export async function getRandomWorkSerialId(): Promise<number | null> {
  if (!(await archiveReady())) return getRandomWorkSerialIdFromGame()
  const modeWhere = await nsfwModeWhere()
  const count = await prisma.work.count({ where: { NOT: { gameId: null }, isCommercial: false, ...modeWhere } })
  if (!count) return null
  const skip = Math.floor(Math.random() * count)
  const w = await prisma.work.findFirst({
    where: { NOT: { gameId: null }, isCommercial: false, ...modeWhere },
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
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { works: { where: { work: { isCommercial: false } } } } } },
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
  const key = cacheKey("galvelica", "daily-pick", await getNsfwMode(), dateKeyOf(new Date()))
  const cached = await cache.get<GalvelicaWorkCard | null>(key)
  if (cached) return cached

  const modeWhere = await nsfwModeWhere()
  const count = await prisma.work.count({ where: { isCommercial: false, ...modeWhere } })
  if (!count) {
    await cache.set(key, null, GAL_CACHE_TTL)
    return null
  }
  const idx = hashString(dateKeyOf(new Date())) % count
  const w = await prisma.work.findFirst({ where: { isCommercial: false, ...modeWhere }, select: workCardSelect(), orderBy: { createdAt: "asc" }, skip: idx, take: 1 })
  const item = w ? mapWorkCard(w as unknown as WorkCardSource) : null
  await cache.set(key, item, GAL_CACHE_TTL)
  if (!item) return null
  return item
}

export async function getTagByName(name: string): Promise<GalvelicaTag | null> {
  if (!(await archiveReady())) return getTagByNameFromGame(name)
  const t = await prisma.tag.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, isVisible: true },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { works: { where: { work: { isCommercial: false } } } } } },
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
  const key = cacheKey("galvelica", "featured-themes", await getNsfwMode())
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
      tagColor: tag.color,
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
  studios?: { studio: { displayName: string | null } }[]
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
    studios: { select: { studio: { select: { displayName: true } } } },
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
    coverSexual: null, // Game 路径无分级数据（仅 Work 路径有）
    studioName: (g.studios ?? []).map((s) => s.studio?.displayName ?? "").filter(Boolean).join(", "),
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

/** Game 体系 NSFW 模式过滤（降级路径用）：sfw 排除 isNsfw / nsfw 只留 isNsfw / all 不过滤 */
async function gameNsfwModeWhere(): Promise<Prisma.GameWhereInput> {
  const mode = await resolveNsfwMode()
  if (mode === "sfw") return { isNsfw: false }
  if (mode === "nsfw") return { isNsfw: true }
  return {}
}

async function publishedWhere(q: GalvelicaListQuery): Promise<Prisma.GameWhereInput> {
  const and: Prisma.GameWhereInput[] = [{ isPublished: true }]
  and.push(await gameNsfwModeWhere())
  // 同 workWhere：NSFW 开关只管封面/截图露骨度，内容 R18 不在此过滤。
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
  if (q.studio) and.push({ studios: { some: { studio: { displayName: { equals: q.studio, mode: "insensitive" } } } } })
  if (q.search && q.search.trim()) {
    const s = q.search.trim()
    and.push({
      OR: [
        { title: { contains: s, mode: "insensitive" } },
        { originalWork: { contains: s, mode: "insensitive" } },
        { studios: { some: { studio: { displayName: { contains: s, mode: "insensitive" } } } } },
        { aliases: { contains: s, mode: "insensitive" } },
      ],
    })
  }
  return { AND: and }
}

function sortToOrderByGame(sort: GalvelicaSort): Prisma.GameOrderByWithRelationInput {
  switch (sort) {
    case "recommended":
      return { favoriteCount: "desc" } // Game 无质量分，回退热度
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
  const where = await publishedWhere(query)
  const [total, rows] = await Promise.all([
    prisma.game.count({ where }),
    prisma.game.findMany({
      where,
      select: workCardSelectGame(),
      orderBy: sortToOrderByGame(query.sort ?? "recommended"),
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
        where: { id: { not: g.id }, isPublished: true, ...(await gameNsfwModeWhere()), tags: { some: { tag: { name: { in: tagNames } } } } },
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
    screenshots: Array.isArray(g.screenshots) ? (g.screenshots as string[]) : [],
    platforms: Array.isArray(g.platforms) ? (g.platforms as string[]) : [],
    languages: Array.isArray(g.languages) ? (g.languages as string[]) : [],
    originalLanguage: g.originalLanguage ?? "",
    officialWebsite: g.officialWebsite ?? "",
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
  const key = cacheKey("galvelica", "recent", await getNsfwMode(), String(limit))
  const cached = await cache.get<GalvelicaWorkCard[]>(key)
  if (cached) return cached
  const rows = await prisma.game.findMany({ where: { isPublished: true, ...(await gameNsfwModeWhere()) }, select: workCardSelectGame(), orderBy: { createdAt: "desc" }, take: limit })
  const items = rows.map(mapCardGame)
  await cache.set(key, items, GAL_CACHE_TTL)
  return items
}

async function getEditorPicksFromGame(limit = 8): Promise<GalvelicaWorkCard[]> {
  const key = cacheKey("galvelica", "editor-picks", await getNsfwMode(), String(limit))
  const cached = await cache.get<GalvelicaWorkCard[]>(key)
  if (cached) return cached
  const modeWhere = await gameNsfwModeWhere()
  let items: GalvelicaWorkCard[] = []
  try {
    const collection = await prisma.curatedCollection.findFirst({
      where: { published: true, name: { contains: "Galvelica", mode: "insensitive" } },
      include: {
        games: {
          where: { game: { isPublished: true, ...modeWhere } },
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
    const rows = await prisma.game.findMany({ where: { isPublished: true, ...modeWhere }, select: workCardSelectGame(), orderBy: { favoriteCount: "desc" }, take: limit })
    items = rows.map(mapCardGame)
  }
  await cache.set(key, items, GAL_CACHE_TTL)
  return items
}

async function getRandomWorkSerialIdFromGame(): Promise<number | null> {
  const modeWhere = await gameNsfwModeWhere()
  const count = await prisma.game.count({ where: { isPublished: true, ...modeWhere } })
  if (!count) return null
  const skip = Math.floor(Math.random() * count)
  const g = await prisma.game.findFirst({ where: { isPublished: true, ...modeWhere }, select: { serialId: true }, skip, take: 1 })
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
  const key = cacheKey("galvelica", "daily-pick", await getNsfwMode(), dateKeyOf(new Date()))
  const cached = await cache.get<GalvelicaWorkCard | null>(key)
  if (cached) return cached
  const modeWhere = await gameNsfwModeWhere()
  const count = await prisma.game.count({ where: { isPublished: true, ...modeWhere } })
  if (!count) {
    await cache.set(key, null, GAL_CACHE_TTL)
    return null
  }
  const idx = hashString(dateKeyOf(new Date())) % count
  const g = await prisma.game.findFirst({ where: { isPublished: true, ...modeWhere }, select: workCardSelectGame(), orderBy: { serialId: "asc" }, skip: idx, take: 1 })
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

// 副站标签预设色板已迁至 @/lib/galvelica-palette（客户端安全模块，避免引入 next/headers 破坏后台编辑组件构建）。
