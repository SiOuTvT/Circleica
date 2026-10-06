import { Prisma } from "@/generated/prisma/client"
import { unstable_cache } from "next/cache"
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

/** 商业作过滤开关：cookie `gal_commercial`（0=隐藏 / 缺省或1=显示）。
 *  默认显示 —— 默认走全库口径，是否排除商业作由用户手动开（不替用户预先过滤）。 */
async function commercialHiddenEnabled(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("gal_commercial")?.value === "0"
  } catch {
    return false
  }
}

/* ── 「不好看」作品降权（不删除、不过滤，只降低在推荐/随机场景的出现概率）────────────
 * 需求口径：真人实拍/写实 3D 与无封面作品「看着不好看」，应降低出现率，
 *           但它们仍属于资料馆（作品库可正常翻到），不做过滤、不移除。
 * 判据：contentFlags 含 LIVE_ACTION（真人实拍/写实 3D）或 coverImage 为空（无封面）。
 * 方式：以 (1 - UNATTRACTIVE_SHARE) 的概率从「好看」池抽样，其余从全池抽样 ——
 *       不好看作品始终保留出现机会（概率不为 0），所以是降权而非过滤。
 * 取值：0.05 → 出现率降到约 1/20。实测全库不好看作品占 1.90%（398/20928），
 *       降权后推荐/随机场景的出现率约 0.095%，即首页、每日、随机几乎都看不到，
 *       但数学上仍保留出现的可能；它们在作品库里则完全不受影响，照常可翻到。
 */
const UNATTRACTIVE_SHARE = 0.05

/** 「好看」池：非真人写实 3D 且有封面 */
function attractiveWhere(base: Prisma.WorkWhereInput): Prisma.WorkWhereInput {
  return {
    AND: [
      base,
      { NOT: { contentFlags: { has: "LIVE_ACTION" } } },
      { NOT: { coverImage: "" } },
    ],
  }
}

/** 按降权策略选池：大概率走「好看」池；不好看作品由小概率的全池抽样兜底（不是过滤） */
async function poolWhere(base: Prisma.WorkWhereInput, rPool: number): Promise<Prisma.WorkWhereInput> {
  if (rPool <= UNATTRACTIVE_SHARE) return base
  const good = attractiveWhere(base)
  try {
    const n = await prisma.work.count({ where: good })
    return n > 0 ? good : base
  } catch {
    return base
  }
}

/** 基准池（列表/统计/抽取共用）：商业作按开关 + NSFW 三段。
 *  真人降权不在这里做 —— 列表必须能看到全库，降权只作用于推荐/随机抽取（poolWhere）。 */
async function basePoolWhere(): Promise<Prisma.WorkWhereInput> {
  const and: Prisma.WorkWhereInput[] = []
  if (await commercialHiddenEnabled()) and.push({ isCommercial: false })
  const nsfw = await nsfwModeWhere()
  if (nsfw && Object.keys(nsfw).length > 0) and.push(nsfw)
  return and.length ? { AND: and } : {}
}

/** 仅含商业作开关的条件（不含 NSFW）。
 *  用于原本就不过 NSFW 的统计/详情查询（年份、社团、标签计数、详情、姊妹作等），
 *  使它们的口径随「隐藏商业作」开关一起变化，避免与作品库总数对不上。 */
async function commercialWhere(): Promise<Prisma.WorkWhereInput> {
  return (await commercialHiddenEnabled()) ? { isCommercial: false } : {}
}

/** 导出给页面缓存 key 使用：商业作开关必须进缓存 key，否则共享缓存会跨用户串号
 *  （用户 A 隐藏商业作的结果被用户 B 显示商业作时命中）。 */
export async function getCommercialHidden(): Promise<boolean> {
  return commercialHiddenEnabled()
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
  /** 制作人员筛选：Creator.id —— 与详情页 staff[].id 同源（同一份 work.creators 关系） */
  staff?: string
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
  const and: Prisma.WorkWhereInput[] = []
  // 基准池：商业作按开关 + NSFW 三段。
  // 真人实拍/写实 3D 与无封面作品在此不做过滤 —— 它们仍属于资料馆，作品库可正常翻到，
  // 仅在推荐/随机抽取场景降权（见 poolWhere / UNATTRACTIVE_SHARE）。
  const base = await basePoolWhere()
  if (Object.keys(base).length > 0) and.push(base)
  if (q.tags && q.tags.length > 0) {
    and.push(...q.tags.map((tagId) => ({ tags: { some: { tagId } } })))
  }
  if (typeof q.year === "number" && !Number.isNaN(q.year)) {
    const from = new Date(q.year, 0, 1)
    const to = new Date(q.year + 1, 0, 1)
    and.push({ releaseDate: { gte: from, lt: to } })
  }
  if (q.studio) and.push({ studioName: q.studio })
  // 制作人员：与详情页 staff[].id 同源，都是 WorkCreator.creatorId
  if (q.staff) and.push({ creators: { some: { creatorId: q.staff } } })
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

// 列表/搜索分页计数聚合：where 已含 NSFW 模式 / 搜索 / 标签 / 年份等全部过滤维度，
// 序列化后作为缓存键的一部分，保证不同筛选条件互不串缓存（PERF-4）。
// Prisma DateTime 过滤接受 ISO 字符串，故 where JSON 往返安全。
const _workCountCache = unstable_cache(
  async (whereJson: string) => prisma.work.count({ where: JSON.parse(whereJson) }),
  ["galvelica-work-count"],
  { revalidate: 60, tags: ["galvelica-works"] },
)
const _gameCountCache = unstable_cache(
  async (whereJson: string) => prisma.game.count({ where: JSON.parse(whereJson) }),
  ["galvelica-game-count"],
  { revalidate: 60, tags: ["galvelica-games"] },
)

export async function listWorks(query: GalvelicaListQuery): Promise<GalvelicaListResult> {
  if (!(await archiveReady())) return listWorksFromGame(query)
  const page = Math.max(1, query.page ?? PAGINATION.DEFAULT_PAGE)
  const pageSize = Math.min(PAGINATION.MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? 24))
  const where = await workWhere(query)

  const total = await _workCountCache(JSON.stringify(where))
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  // 越界回落：page 超出总页数时按最后一页返回，避免空列表（副站规则）
  const safePage = Math.min(page, totalPages)
  const rows = await prisma.work.findMany({
    where,
    select: workCardSelect(),
    orderBy: workSortToOrderBy(query.sort ?? "recommended"),
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  })

  return {
    items: rows.map(mapWorkCard),
    total,
    page: safePage,
    pageSize,
    totalPages,
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
  const work = await prisma.work.findFirst({ where: { slug, ...(await commercialWhere()) }, select: { id: true } })
  if (!work) return null
  return buildDetailFromWork(work.id, null)
}

async function buildDetailFromWork(workId: string, fallbackGameId: string | null): Promise<GalvelicaWorkDetail | null> {
  const work = await prisma.work.findFirst({
    where: { id: workId, ...(await commercialWhere()) },
    include: {
      game: { select: { serialId: true } },
      sources: { select: { source: true, externalId: true } },
      tags: { where: { tag: { source: "galvelica" } }, select: { tag: { select: { id: true, name: true, color: true, group: { select: { name: true, color: true } } } } } },
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
        where: { id: { not: work.id }, ...(await commercialWhere()), ...(await nsfwModeWhere()), tags: { some: { tag: { name: { in: tagNames } } } } },
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

export async function getPopularTags(limit = 300): Promise<GalvelicaTag[]> {
  // 副站标签必须只来自副站作品，绝不回退到主站标签（否则会把主站标签混进「其他」分组）
  if (!(await archiveReady())) return []
  const key = cacheKey("galvelica", "popular-tags", String(limit))
  const cached = await cache.get<GalvelicaTag[]>(key)
  if (cached) return cached

  const rows = await prisma.tag.findMany({
    // 只统计仍被「非商业同人作品」使用的标签（商业系列已从 WorkTag 清理，显式过滤双保险）
    where: { source: "galvelica", works: { some: { work: await commercialWhere() } } },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { works: { where: { work: await commercialWhere() } } } } },
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

  const rows = await prisma.work.findMany({ where: { NOT: { releaseDate: null }, ...(await commercialWhere()) }, select: { releaseDate: true } })
  const map = new Map<number, number>()
  for (const r of rows) {
    if (!r.releaseDate) continue
    const y = r.releaseDate.getFullYear()
    map.set(y, (map.get(y) ?? 0) + 1)
  }
  const sorted = [...map.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year)
  const thisYear = new Date().getFullYear()
  // 发布时间在今天之后的年份（未来年份）整体沉到列表末尾，其余保持倒序，避免未发布年份占第一屏
  const future = sorted.filter((y) => y.year > thisYear)
  const past = sorted.filter((y) => y.year <= thisYear)
  const years = [...past, ...future]
  await cache.set(key, years, GAL_CACHE_TTL)
  return years
}

export async function getStudios(): Promise<{ name: string; count: number }[]> {
  if (!(await archiveReady())) return getStudiosFromGame()
  const key = cacheKey("galvelica", "studios")
  const cached = await cache.get<{ name: string; count: number }[]>(key)
  if (cached) return cached

  const rows = await prisma.work.findMany({ where: { NOT: { studioName: "" }, ...(await commercialWhere()) }, select: { studioName: true } })
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

export interface GalvelicaStaffBrief {
  id: string
  name: string
  /** 该人在本站参与的作品数（用于「只有 1 部就不给链接」的判断） */
  workCount: number
}

/**
 * 制作人员概览：一次取人 + 一次按人聚合计数，不为每个人单独发查询。
 * 匹配键 = Creator.id，与详情页 work.staff[].id 完全同源（都来自 work.creators
 * 关系的 creator.id），所以点人名必然能查到同一个人。
 */
export async function getStaffBrief(ids: string[]): Promise<GalvelicaStaffBrief[]> {
  const uniq = [...new Set(ids)].filter(Boolean)
  if (!uniq.length) return []
  const archive = await archiveReady()
  const [people, counted] = await Promise.all([
    prisma.creator.findMany({ where: { id: { in: uniq } }, select: { id: true, name: true } }),
    archive
      ? prisma.workCreator.groupBy({
          by: ["creatorId"],
          where: { creatorId: { in: uniq }, work: await commercialWhere() },
          _count: { _all: true },
        })
      : prisma.gameCreator.groupBy({
          by: ["creatorId"],
          where: { creatorId: { in: uniq }, game: { isPublished: true } },
          _count: { _all: true },
        }),
  ])
  const counts = new Map(counted.map((r) => [r.creatorId, r._count._all]))
  return people.map((p) => ({ id: p.id, name: p.name, workCount: counts.get(p.id) ?? 0 }))
}

/** 一批标签各自的站内作品数（一次聚合，用于挑「最不通用」的那个标签） */
export async function getTagWorkCounts(tagIds: string[]): Promise<Record<string, number>> {
  const uniq = [...new Set(tagIds)].filter(Boolean)
  if (!uniq.length) return {}
  if (!(await archiveReady())) return {}
  const rows = await prisma.workTag.groupBy({
    by: ["tagId"],
    where: { tagId: { in: uniq }, work: await commercialWhere() },
    _count: { _all: true },
  })
  const out: Record<string, number> = {}
  for (const r of rows) out[r.tagId] = r._count._all
  return out
}

/**
 * 全库作品总数（含商业作）—— 首页「编辑精选」区块头「N 部里挑出 8 部」的那个 N。
 *
 * ⚠️ 口径说明（改版后）：本函数返回全库总数（含商业作、含真人实拍/无封面作品）。
 * 与作品库 listWorks().total 的差异现在只剩 NSFW 三段模式（未登录强制 sfw，排除露骨封面）——
 * 即已登录 all 模式下两者一致；未登录因合规强制 sfw 会少掉露骨作品那部分。
 * 商业作与「不好看」作品都不再默认过滤：商业作由用户开关决定（默认显示），
 * 真人实拍/写实 3D 与无封面作品只做降权（推荐/随机场景降低出现率），列表里仍可正常翻到。
 * （实测：全库 20928，其中商业作仅 173）
 * 副站归档未就绪时回退到主站 Game 总数，与 getEditorPicks 等函数的回退策略一致。
 */
export async function getTotalWorkCount(): Promise<number> {
  if (!(await archiveReady())) return prisma.game.count()
  const key = cacheKey("galvelica", "total-work-count")
  const cached = await cache.get<number>(key)
  if (cached != null) return cached
  const total = await prisma.work.count()
  await cache.set(key, total, GAL_CACHE_TTL)
  return total
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
        const works = await prisma.work.findMany({ where: { id: { in: workIds }, ...(await basePoolWhere()) }, select: workCardSelect() })
        items = works.map(mapWorkCard)
      }
    }
  } catch (err) {
    logger.api.warn("[galvelica:getEditorPicks] curated collection lookup failed, fallback", { error: String(err) })
  }

  if (!items.length) {
    // 兜底走「好看」池（编辑精选本就该挑好看的）；好看池为空的极端情况才回退全池
    const base = await basePoolWhere()
    let rows = await prisma.work.findMany({ where: attractiveWhere(base), select: workCardSelect(), orderBy: { favoriteCount: "desc" }, take: limit })
    if (!rows.length) {
      rows = await prisma.work.findMany({ where: base, select: workCardSelect(), orderBy: { favoriteCount: "desc" }, take: limit })
    }
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

/**
 * 取一个随机作品的跳转目标（serialId 或 slug）。
 * 真正的跳转由页面用客户端 router.replace 完成（见 random-redirect.tsx）——服务端
 * redirect() 在异步 Server Component 里偶发会退化成 200 + 空 body（流式响应已 flush
 * 后再调用 redirect 发不出 307），故这里只负责"可靠地取到候选"。
 * 取候选本身也做了重试：第一次查不到（archiveReady / nsfwModeWhere 偶发失败被 catch，
 * 或首屏 count 抖动）会在同一次请求内再试，最多 3 次，仍取不到才返回 null。
 */
export async function getRandomWorkSerialId(): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const id = await pickRandomWorkOnce()
      if (id) return id
    } catch {
      // 偶发失败（DB 抖动 / archiveReady / nsfwModeWhere 抛错）→ 重试一次再判失败
    }
  }
  return null
}

async function pickRandomWorkOnce(): Promise<string | null> {
  if (!(await archiveReady())) return getRandomWorkSerialIdFromGame()
  const base = await basePoolWhere()
  const where = await poolWhere(base, Math.random())
  const count = await prisma.work.count({ where })
  if (!count) return null
  const skip = Math.floor(Math.random() * count)
  const w = await prisma.work.findFirst({
    where,
    select: { slug: true, gameId: true, game: { select: { serialId: true } } },
    orderBy: { createdAt: "asc" },
    skip,
    take: 1,
  })
  if (!w) return null
  // 已收录（有 Game 锚点）→ 用作品 serialId；否则用 slug（详情路由两者都解析）
  return w.gameId && w.game ? String(w.game.serialId) : w.slug
}

export async function getTagById(tagId: string): Promise<GalvelicaTag | null> {
  if (!(await archiveReady())) return getTagByIdFromGame(tagId)
  const t = await prisma.tag.findFirst({
    where: { id: tagId, source: "galvelica" },
    select: { id: true, name: true, color: true, group: { select: { name: true, color: true } }, _count: { select: { works: { where: { work: await commercialWhere() } } } } },
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

  const base = await basePoolWhere()
  // 同一天所有人看到同一部：池选择与索引都由日期 hash 派生（确定性）。
  // 走降权池 —— 不好看作品仍可能被抽中，只是概率大幅降低。
  const h = hashString(dateKeyOf(new Date()))
  const where = await poolWhere(base, (h % 1000) / 1000)
  const count = await prisma.work.count({ where })
  if (!count) {
    await cache.set(key, null, GAL_CACHE_TTL)
    return null
  }
  const idx = h % count
  const w = await prisma.work.findFirst({ where, select: workCardSelect(), orderBy: { createdAt: "asc" }, skip: idx, take: 1 })
  const item = w ? mapWorkCard(w as unknown as WorkCardSource) : null
  await cache.set(key, item, GAL_CACHE_TTL)
  if (!item) return null
  return item
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
  // 制作人员：Game 回退路径同样按 Creator.id 匹配（GameCreator.creatorId）
  if (q.staff) and.push({ creators: { some: { creatorId: q.staff } } })
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
  const pageSize = Math.min(PAGINATION.MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? 24))
  const where = await publishedWhere(query)
  const total = await _gameCountCache(JSON.stringify(where))
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const rows = await prisma.game.findMany({
    where,
    select: workCardSelectGame(),
    orderBy: sortToOrderByGame(query.sort ?? "recommended"),
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  })
  return { items: rows.map(mapCardGame), total, page: safePage, pageSize, totalPages }
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
  const sorted = [...map.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year)
  const thisYear = new Date().getFullYear()
  // 发布时间在今天之后的年份（未来年份）整体沉到列表末尾，其余保持倒序，避免未发布年份占第一屏
  const future = sorted.filter((y) => y.year > thisYear)
  const past = sorted.filter((y) => y.year <= thisYear)
  const years = [...past, ...future]
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

async function getRandomWorkSerialIdFromGame(): Promise<string | null> {
  const modeWhere = await gameNsfwModeWhere()
  const count = await prisma.game.count({ where: { isPublished: true, ...modeWhere } })
  if (!count) return null
  const skip = Math.floor(Math.random() * count)
  const g = await prisma.game.findFirst({ where: { isPublished: true, ...modeWhere }, select: { serialId: true }, skip, take: 1 })
  return g ? String(g.serialId) : null
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

// 副站标签预设色板已迁至 @/lib/galvelica-palette（客户端安全模块，避免引入 next/headers 破坏后台编辑组件构建）。
