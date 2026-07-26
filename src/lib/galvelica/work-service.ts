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
import { Prisma, type WorkSourceType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdapter } from "./sources"
import { mergeSources, type FusedSource, type FusionResult } from "./fusion"
import type { NormalizedWork, SourceKey } from "./sources/types"

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
  const normalized = adapter.normalize(raw)

  // 先看是否已有同源同 ID 的源 → 复用 Work
  const existingSource = await prisma.workSource.findFirst({
    where: { source: sourceKey as WorkSourceType, externalId },
    select: { workId: true },
  })

  let workId = existingSource?.workId

  if (!workId) {
    const slug = await ensureUniqueSlug(opts.slug || slugify(normalized.title || externalId))
    const created = await prisma.work.create({
      data: {
        slug,
        gameId: opts.gameId,
        title: normalized.title || externalId,
      },
    })
    workId = created.id
  }

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

  await fuseWork(workId)
  return workId
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

export { mergeSources }
export type { FusionResult, FusedSource } from "./fusion"
