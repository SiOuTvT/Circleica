/**
 * Galvelica 档案编排层（Stage D / C）
 *
 * 把「数据源适配器 → WorkSource 原始载荷 → 融合引擎 → Work 有效字段」串起来：
 *   - getOrCreateWorkFromSource：按外部 ID 拉取并建/更新 Work（未来后台导入、VNDB/Bangumi 接入用）
 *   - fuseWork：对某个 Work 运行字段级融合，写入标量字段 + provenance，并同步标签/创作者关系
 *   - refetchSource：重拉某源原始载荷后重新融合（保证「Galvelica 永远保留自己的最终资料」可随源更新）
 *
 * 所有函数均为纯数据操作，不渲染、不鉴权；鉴权由调用方（路由 / 脚本 / 后台）负责。
 */
import { Prisma, type WorkSourceType, type GameStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdapter } from "./sources"
import { mergeSources, type FusedSource, type FusionResult } from "./fusion"
import type { NormalizedWork, SourceKey } from "./sources/types"

/* ── 跨源匹配（去重核心） ─────────────────────────── */
/**
 * 归一化匹配键：去声调 / 小写 / 去非字母数字（保留中日韩）/ 去首尾空白。
 * 用于跨源判定「同一作品」——VNDB 罗马音标题与 CnGal 中文译名经原名(anotherName)对齐。
 */
export function normalizeMatchKey(input: string | null | undefined): string {
  if (!input) return ""
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]/g, "")
    .trim()
}

/** 取归一化作品的所有候选匹配键（title/originalWork/englishName/别名），长度 >=3 才计入。 */
export function candidateMatchKeys(n: NormalizedWork): string[] {
  const out = new Set<string>()
  const texts: (string | undefined)[] = [n.title, n.originalWork, n.englishName, ...(n.aliases ?? [])]
  for (const t of texts) {
    const k = normalizeMatchKey(t)
    if (k.length >= 3) out.add(k)
  }
  return [...out]
}

function dateMonthKey(d: Date | string | null | undefined): string | null {
  if (!d) return null
  const dt = typeof d === "string" ? new Date(d) : d
  if (isNaN(dt.getTime())) return null
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`
}

/** 两发售日是否兼容：一方缺失视为兼容；否则同月或相差 <=1.5 个月。 */
export function releaseDatesCompatible(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
): boolean {
  const ka = dateMonthKey(a)
  const kb = dateMonthKey(b)
  if (!ka || !kb) return true
  if (ka === kb) return true
  const ma = new Date(a!).getTime()
  const mb = new Date(b!).getTime()
  return Math.abs(ma - mb) / (1000 * 60 * 60 * 24 * 30) <= 1.5
}

/* 内存跨源索引：ingest 启动调用 buildCrossSourceIndex() 填充；upsertWorkFromRaw 据此把新源
   挂到已有跨源 Work 而非新建。未构建时（如独立调用）回退为「不跨源匹配」，保持原行为、零回归。 */
let crossSourceIndex: Map<string, string[]> | null = null

export async function buildCrossSourceIndex(): Promise<void> {
  crossSourceIndex = new Map()
  const works = await prisma.work.findMany({
    select: { id: true, title: true, originalWork: true, englishName: true, aliases: true },
  })
  for (const w of works) {
    registerWorkToIndex(w.id, [w.title, w.originalWork, w.englishName, w.aliases])
  }
}

function registerWorkToIndex(workId: string, texts: (string | null | undefined)[]): void {
  if (!crossSourceIndex) return
  for (const t of texts) {
    const k = normalizeMatchKey(t)
    if (k.length >= 3) {
      const arr = crossSourceIndex.get(k) ?? []
      if (!arr.includes(workId)) arr.push(workId)
      crossSourceIndex.set(k, arr)
    }
  }
}

/**
 * 为「即将入库的作品」寻找已有的跨源 Work（不同源、标题/原名/别名命中、发售日兼容）。
 * 命中返回该 Work id，调用方应把新源挂到它上面而非新建 Work。无索引时返回 null。
 */
export async function findCrossSourceMatch(
  sourceKey: SourceKey,
  normalized: NormalizedWork,
): Promise<string | null> {
  if (!crossSourceIndex) return null
  const keys = candidateMatchKeys(normalized)
  if (keys.length === 0) return null
  const candSet = new Set<string>()
  for (const k of keys) for (const id of crossSourceIndex.get(k) ?? []) candSet.add(id)
  if (candSet.size === 0) return null
  const candidates = await prisma.work.findMany({
    where: { id: { in: [...candSet] } },
    select: { id: true, releaseDate: true, sources: { select: { source: true } } },
  })
  const myDate = normalized.releaseDate ? new Date(normalized.releaseDate) : null
  for (const c of candidates) {
    const sources = new Set(c.sources.map((s) => s.source))
    if (sources.has(sourceKey)) continue // 同源不合并
    if (!releaseDatesCompatible(myDate, c.releaseDate)) continue
    return c.id
  }
  return null
}

/* ── slug 工具 ───────────────────────────────────── */

export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[̀-​]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return base || "work"
}

/** 保证 slug 在 Work 表内唯一（冲突时追加序号） */
async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base
  let n = 2
  // 上限保护，避免极端情况下死循环
  while (n < 1000) {
    const exists = await prisma.work.findUnique({ where: { slug }, select: { id: true } })
    if (!exists) return slug
    slug = `${base}-${n}`
    n++
  }
  return `${base}-${Date.now()}`
}

/* ── 标签 / 创作者解析（按名复用，缺失则建） ────── */

/** 按名复用或新建 Tag；返回 Tag id。 */
async function resolveTagByName(name: string): Promise<string> {
  const clean = name.trim()
  if (!clean) throw new Error("empty tag name")
  const existing = await prisma.tag.findFirst({ where: { name: clean }, select: { id: true } })
  if (existing) return existing.id
  const created = await prisma.tag.create({
    data: { name: clean, color: "#a78bfa", isVisible: true },
  })
  return created.id
}

/** 按名复用或新建 Creator；返回 Creator id（若有原名则补全）。 */
async function resolveCreatorByName(name: string, nameJa?: string): Promise<string> {
  const clean = name.trim()
  if (!clean) throw new Error("empty creator name")
  const existing = await prisma.creator.findFirst({ where: { name: clean }, select: { id: true } })
  if (existing) {
    if (nameJa && !existing) {
      // 仅当确实需要补全原名时更新（findFirst 已返回 id，这里不额外查询，交由调用方决定）
    }
    return existing.id
  }
  const created = await prisma.creator.create({
    data: { name: clean, nameJa: nameJa ?? "" },
  })
  return created.id
}

/** 把标签名列表同步到 Work 的 WorkTag 关系（按名解析，缺失则新建 Tag）。 */
async function applyTagsToWork(workId: string, tagNames: string[]): Promise<void> {
  const clean = Array.from(new Set(tagNames.map((t) => t.trim()).filter(Boolean)))
  if (clean.length === 0) {
    await prisma.workTag.deleteMany({ where: { workId } })
    return
  }
  const ids = await Promise.all(clean.map(resolveTagByName))
  await prisma.workTag.deleteMany({ where: { workId, NOT: { tagId: { in: ids } } } })
  await prisma.workTag.createMany({
    data: ids.map((tagId) => ({ workId, tagId })),
    skipDuplicates: true,
  })
}

/** 把创作者列表同步到 Work 的 WorkCreator 关系。 */
async function applyCreatorsToWork(
  workId: string,
  creators: { name: string; role: string; sourceId?: string; nameJa?: string }[],
): Promise<void> {
  const wanted: { creatorId: string; role: string; nameJa?: string }[] = []
  for (const c of creators) {
    const creatorId = await resolveCreatorByName(c.name, c.nameJa)
    wanted.push({ creatorId, role: (c.role || "other").trim(), nameJa: c.nameJa })
  }
  // 删除不再出现的创作者
  await prisma.workCreator.deleteMany({
    where: { workId, NOT: { creatorId: { in: wanted.map((w) => w.creatorId) } } },
  })
  // 增量 upsert（按 workId+creatorId+role 唯一）
  for (const w of wanted) {
    await prisma.workCreator.upsert({
      where: { workId_creatorId_role: { workId, creatorId: w.creatorId, role: w.role } },
      create: { workId, creatorId: w.creatorId, role: w.role },
      update: {},
    })
  }
}

/* ── 融合核心 ───────────────────────────────────── */

/**
 * 把一个 Work 的所有源载荷融合进其标量字段 + provenance，并同步标签/创作者。
 * 人工锁定的字段（work.manualFields）不会被覆盖，provenance 标记 manual。
 */
export async function fuseWork(workId: string): Promise<void> {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: { sources: true },
  })
  if (!work) return

  const sources: FusedSource[] = []
  for (const s of work.sources) {
    if (s.raw == null) continue // 省空间模式已清空 raw 的源跳过（需重融合时由 refetch 重新拉取）
    const adapter = getAdapter(s.source as SourceKey)
    let data: NormalizedWork
    if (adapter) {
      data = adapter.normalize(s.raw)
    } else {
      // 无适配器的源（如 MANUAL、尚未实现的源）：直接把 raw 当作已归一化结构
      data = (s.raw ?? {}) as NormalizedWork
    }
    if (data && Object.keys(data).length > 0) {
      sources.push({ key: s.source as SourceKey, data })
    }
  }

  if (sources.length === 0) return // 无源可融合，保留现状

  const manualFields: string[] = Array.isArray(work.manualFields) ? work.manualFields : []
  const result: FusionResult = mergeSources(sources, manualFields)

  // 保留人工锁定字段的现有值
  const patch: Prisma.WorkUpdateInput = { ...(result.fields as Prisma.WorkUpdateInput) }
  // releaseDate 字符串 → Date（Prisma DateTime 需要完整 ISO-8601）
  if (typeof patch.releaseDate === "string" && patch.releaseDate) {
    const d = new Date(patch.releaseDate + (patch.releaseDate.length === 10 ? "T00:00:00Z" : ""))
    if (!isNaN(d.getTime())) patch.releaseDate = d
    else delete patch.releaseDate
  }
  // provenance：融合字段写引擎结果；人工字段标记 manual 并保留原 provenance（若有）
  const prevProvenance = (work.provenance ?? {}) as Record<string, { source: string; manual: boolean }>
  const nextProvenance: Record<string, { source: string; manual: boolean }> = {}
  for (const [field, entry] of Object.entries(result.provenance)) {
    nextProvenance[field] = { source: entry.source, manual: false }
  }
  for (const f of manualFields) {
    nextProvenance[f] = { source: prevProvenance[f]?.source ?? "MANUAL", manual: true }
  }

  await prisma.work.update({
    where: { id: workId },
    data: {
      ...patch,
      provenance: nextProvenance as unknown as Prisma.InputJsonValue,
      lastFusedAt: new Date(),
    },
  })

  // 同步关系型字段
  await applyTagsToWork(workId, result.tags.map((t) => t.name))
  await applyCreatorsToWork(
    workId,
    result.creators.map((c) => ({ name: c.name, role: c.role, sourceId: c.sourceId, nameJa: c.nameJa })),
  )
}

/* ── 按外部 ID 建 / 更新 Work ──────────────────── */

export interface GetOrCreateOptions {
  /** 显式 slug（否则由标题生成） */
  slug?: string
  /** 若已知对应 Game，回填 gameId 锚点 */
  gameId?: string
  /** 同人分类（PURE 纯正同人 / DERIVATIVE 同人系公司商业作），由摄入脚本按生产者类型判定 */
  doujinCategory?: "PURE" | "DERIVATIVE"
}

/**
 * 用「已拉取到的原始 payload」建/更新 Work（不再二次拉取）。
 * 供 getOrCreateWorkFromSource（先拉后建）与广收录脚本（列表直出 raw）共用。
 * 幂等：同源同 externalId 的源复用已有 Work，不重复建。返回 Work id。
 */
export async function upsertWorkFromRaw(
  sourceKey: SourceKey,
  externalId: string,
  raw: unknown,
  opts: GetOrCreateOptions = {},
): Promise<string | null> {
  const adapter = getAdapter(sourceKey)
  if (!adapter) return null
  if (raw == null) return null
  const normalized = adapter.normalize(raw)

  // 先看是否已有同源同 ID 的源 → 复用 Work
  const existingSource = await prisma.workSource.findFirst({
    where: { source: sourceKey as WorkSourceType, externalId },
    select: { workId: true },
  })

  let workId = existingSource?.workId

  // 跨源匹配：若已有「不同源」的 Work 表示同一作品，则把当前源挂到它上面（去重），
  // 而不是新建一个重复 Work。无内存索引时不匹配，保持原行为。
  if (!workId) {
    const matchId = await findCrossSourceMatch(sourceKey, normalized)
    if (matchId) workId = matchId
  }

  if (!workId) {
    const slug = await ensureUniqueSlug(opts.slug || slugify(normalized.title || externalId))
    const created = await prisma.work.create({
      data: {
        slug,
        gameId: opts.gameId,
        title: normalized.title || externalId,
        doujinCategory: opts.doujinCategory ?? null,
      },
    })
    workId = created.id
  }

  // 把本作品的匹配键登记进内存索引，供同一次 ingest 中后续条目做跨源去重
  registerWorkToIndex(workId, [
    normalized.title,
    normalized.originalWork,
    normalized.englishName,
    (normalized.aliases ?? []).join(", "),
  ])

  await prisma.workSource.upsert({
    where: { workId_source: { workId, source: sourceKey as WorkSourceType } },
    create: {
      workId,
      source: sourceKey as WorkSourceType,
      externalId,
      raw: raw as unknown as Prisma.InputJsonValue,
      status: "ok",
    },
    update: {
      raw: raw as unknown as Prisma.InputJsonValue,
      externalId,
      status: "ok",
      fetchedAt: new Date(),
    },
  })

  // 同人分类：已知且 Work 当前为空则补写（跨源匹配挂到已有 Work 时也能补齐）
  if (opts.doujinCategory) {
    await prisma.work.updateMany({
      where: { id: workId, doujinCategory: null },
      data: { doujinCategory: opts.doujinCategory },
    })
  }

  await fuseWork(workId)

  // 省空间模式（GALVELICA_KEEP_RAW=0）：融合完成后丢弃原始 JSON 缓存，
  // 仅保留 source 行（记录 externalId）以便日后按需重拉。可砍掉 70–80% 存储。
  if (process.env.GALVELICA_KEEP_RAW === "0") {
    await prisma.workSource.updateMany({
      where: { workId, source: sourceKey as WorkSourceType },
      data: { raw: Prisma.JsonNull },
    })
  }

  return workId
}

/**
 * 按数据源 + 外部 ID 拉取并建/更新 Work。
 * 返回 Work id；若适配器不可用或拉取失败返回 null。
 */
export async function getOrCreateWorkFromSource(
  sourceKey: SourceKey,
  externalId: string,
  opts: GetOrCreateOptions = {},
): Promise<string | null> {
  const adapter = getAdapter(sourceKey)
  if (!adapter) return null
  const raw = await adapter.fetchByExternalId(externalId)
  if (raw == null) return null
  return upsertWorkFromRaw(sourceKey, externalId, raw, opts)
}

/** 重拉某源原始载荷并重新融合。 */
export async function refetchSource(workId: string, sourceKey: SourceKey): Promise<boolean> {
  const src = await prisma.workSource.findFirst({
    where: { workId, source: sourceKey as WorkSourceType },
  })
  if (!src) return false
  const adapter = getAdapter(sourceKey)
  if (!adapter) return false
  const raw = await adapter.fetchByExternalId(src.externalId)
  if (raw == null) return false
  await prisma.workSource.update({
    where: { id: src.id },
    data: { raw: raw as unknown as Prisma.InputJsonValue, status: "ok", fetchedAt: new Date() },
  })
  await fuseWork(workId)
  return true
}

/**
 * 给「已存在」的 Work 追加一个数据源（拉取原始载荷并重新融合）。
 * 与 getOrCreateWorkFromSource 不同：本函数不会新建 Work，只往现有 Work 挂源，
 * 用于回填后的多源补录（如 VNDB 资料库作品关联到 Bangumi）。返回是否成功。
 */
export async function attachSourceToWork(
  workId: string,
  sourceKey: SourceKey,
  externalId: string,
): Promise<boolean> {
  const adapter = getAdapter(sourceKey)
  if (!adapter) return false
  const raw = await adapter.fetchByExternalId(externalId)
  if (raw == null) return false
  await prisma.workSource.upsert({
    where: { workId_source: { workId, source: sourceKey as WorkSourceType } },
    create: {
      workId,
      source: sourceKey as WorkSourceType,
      externalId,
      raw: raw as unknown as Prisma.InputJsonValue,
      status: "ok",
    },
    update: {
      externalId,
      raw: raw as unknown as Prisma.InputJsonValue,
      status: "ok",
      fetchedAt: new Date(),
    },
  })
  await fuseWork(workId)
  return true
}

/* ── 收录采纳：自动建草稿（Stage E 采纳模型 A） ── */

const VALID_GAME_STATUS: GameStatus[] = ["FINISHED", "ONGOING", "HIATUS", "CANCELLED"]

/**
 * 按 Work 融合字段预填一份「未发布 Game 草稿」并关联（采纳模型 A：申请即自动建草稿）。
 * 幂等：若 Work 已绑定 Game（草稿或已发布），直接返回该 Game id，不再新建。
 * 返回 Game id。
 */
export async function createDraftGameFromWork(workId: string): Promise<string> {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: {
      sources: { select: { source: true, externalId: true } },
      tags: { select: { tagId: true } },
      creators: { select: { creatorId: true, role: true } },
    },
  })
  if (!work) throw new Error("work not found")

  if (work.gameId) {
    const existing = await prisma.game.findUnique({ where: { id: work.gameId }, select: { id: true } })
    if (existing) return existing.id
  }

  const vndbSource = work.sources.find((s) => s.source === "VNDB")
  const status: GameStatus = VALID_GAME_STATUS.includes(work.status as GameStatus)
    ? (work.status as GameStatus)
    : "FINISHED"

  const game = await prisma.game.create({
    data: {
      title: work.title,
      originalWork: work.originalWork,
      englishName: work.englishName,
      description: work.description,
      coverImage: work.coverImage,
      releaseDate: work.releaseDate,
      status,
      gameDuration: work.duration,
      aliases: work.aliases,
      studioName: work.studioName,
      isNsfw: work.isNsfw,
      vndbId: vndbSource?.externalId ?? "",
      isPublished: false,
    },
  })

  const tagIds = work.tags.map((t) => t.tagId)
  if (tagIds.length) {
    await prisma.gameTag.createMany({
      data: tagIds.map((tagId) => ({ gameId: game.id, tagId })),
      skipDuplicates: true,
    })
  }
  const creators = work.creators.map((c) => ({ gameId: game.id, creatorId: c.creatorId, role: c.role }))
  if (creators.length) {
    await prisma.gameCreator.createMany({ data: creators, skipDuplicates: true })
  }

  await prisma.work.update({ where: { id: work.id }, data: { gameId: game.id } })
  return game.id
}

export { mergeSources }
export type { FusionResult, FusedSource } from "./fusion"
