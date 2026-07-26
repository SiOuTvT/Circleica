/**
 * Galvelica 字段级融合引擎（Stage D，核心）
 *
 * 纯函数，不触碰数据库。把来自多个数据源（VNDB / Bangumi / 人工 …）的归一化结构，
 * 按 ADR §5 的「字段级融合优先级表」合并为单一「有效展示值」：
 *   - 多数字段：按优先级取首个非空（取优）
 *   - aliases / tags / creators：多源合并去重（union）
 *   - description：取最长非空
 *
 * 人工锁定字段（manualFields）会被跳过，确保「Galvelica 永远保留自己的最终资料」。
 */
import type { NormalizedWork, SourceKey } from "./sources/types"

/** 融合后写入 Work 的标量字段（与 Work 模型标量字段一一对应） */
export interface FusedFields {
  title: string
  originalWork: string
  englishName: string
  aliases: string
  description: string
  coverImage: string
  releaseDate: string
  studioName: string
  officialUrl: string
  steamAppId: string
}

/** 单字段的 provenance：来自哪个源、是否人工锁定 */
export interface ProvenanceEntry {
  source: SourceKey | "MANUAL"
  manual: boolean
}

/** 一个待融合的源：键 + 已归一化数据（raw 已由适配器转成 NormalizedWork） */
export interface FusedSource {
  key: SourceKey
  data: NormalizedWork
}

/**
 * 字段级融合优先级表（ADR §5）。
 * 数组顺序即「优 → 劣」；`aliases` 与 `description` 走特殊合并策略（见 mergeSources）。
 */
/**
 * 字段级融合优先级表（ADR §5）—— 核心原则「权威优先、高质量优先」。
 *
 * 数组顺序即「优 → 劣」；取值策略见 mergeSources：
 *   - 标量字段（title/releaseDate/coverImage/...）：按优先级取首个非空
 *   - aliases：多源 union 去重
 *   - description：取最长非空（= 信息最完整）
 *
 * 各源权威面（决定其在对应字段的排位）：
 *   - VNDB      ：全球 VN 资料库，canonical 元数据最权威（标题/原名/发售日/简介/社团/标签/Staff）
 *   - BANGUMI   ：中文社区，中文译名/别名/简介质量最高
 *   - YMGAL     ：月幕，中文 galge 档案，补中文译名/封面/制作人员（无 tags、无稳定社团名）
 *   - CNGL      ：CnGal，国产/汉化同人，封面与制作组完整（无 tags）
 *   - STEAM     ：商店，提供高质量封面(header_image)与可靠发售日；仅放行 VN genre
 *   - DLSITE    ：商业购买源，官方购买链接/商业封面最权威（暂未实现，预留位）
 *   - MANUAL    ：站长人工条目/锁定字段；作兜底，外部权威源存在时让位（已锁定字段不受影响）
 */
export const FUSION_TABLE: Record<keyof FusedFields, SourceKey[]> = {
  // canonical 标题：VNDB 权威；中文源按序补位（中文译名进 aliases/originalWork）
  title: ["VNDB", "BANGUMI", "YMGAL", "CNGL", "MANUAL"],
  // 原名（日文/官方）：VNDB 最权威
  originalWork: ["VNDB", "MANUAL"],
  // 英文名：VNDB 权威
  englishName: ["VNDB", "MANUAL"],
  // 别名：多源 union，VNDB 起头
  aliases: ["VNDB", "BANGUMI", "YMGAL", "CNGL"],
  // 简介：取最长非空（信息最完整）；VNDB 长简介优先，中文源补位，Steam 短描述兜底
  description: ["VNDB", "BANGUMI", "YMGAL", "CNGL", "STEAM", "MANUAL"],
  // 封面：权威+高质量排序 —— VNDB(canonical) → STEAM(高分辨率商店图) → CNGL → YMGAL → BANGUMI → 人工 → DLSITE(商业预留)
  coverImage: ["VNDB", "STEAM", "CNGL", "YMGAL", "BANGUMI", "MANUAL", "DLSITE"],
  // 发售日：VNDB 权威 → 中文源(ISO) → STEAM(格式偶不规整，仅作最后兜底)
  releaseDate: ["VNDB", "BANGUMI", "YMGAL", "CNGL", "STEAM", "MANUAL"],
  // 社团：VNDB(含 developers) → Bangumi → CnGal(productionGroups)；月幕/Steam 无稳定社团名不纳入
  studioName: ["VNDB", "BANGUMI", "CNGL", "MANUAL"],
  // 官方购买链接：DLsite 权威（暂未实现，预留）
  officialUrl: ["DLSITE", "MANUAL"],
  // Steam appid：Steam 权威
  steamAppId: ["STEAM", "MANUAL"],
}

export interface FusionResult {
  /** 仅含「非人工锁定」字段的融合值，供调用方写入 Work（人工字段由调用方保留原值） */
  fields: Partial<FusedFields>
  /** 每个被融合字段的 provenance */
  provenance: Record<string, ProvenanceEntry>
  /** 多源合并去重后的标签（name 已去重，保留首个 sourceId） */
  tags: { name: string; sourceId?: string }[]
  /** 多源合并去重后的创作者（按 name+role 去重，保留信息更完整者） */
  creators: { name: string; role: string; sourceId?: string; nameJa?: string }[]
}

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

/** 把逗号 / 换行分隔的别名串拆成去重数组 */
function splitAliases(raw: string | undefined): string[] {
  if (!raw) return []
  return Array.from(
    new Set(
      raw
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  )
}

/**
 * 合并多源为单一融合结果。
 * @param sources 已归一化的各源（顺序无关，引擎内部按 FUSION_TABLE 决定优先级）
 * @param manualFields 被人工锁定的字段名集合——这些字段不会出现在返回的 fields 中，
 *                     调用方应保留 Work 上该字段的现有值。
 */
export function mergeSources(sources: FusedSource[], manualFields: string[] = []): FusionResult {
  const manual = new Set(manualFields)
  const fields: Partial<FusedFields> = {}
  const provenance: Record<string, ProvenanceEntry> = {}

  const byKey = new Map<SourceKey, NormalizedWork>()
  for (const s of sources) byKey.set(s.key, s.data)

  // ── 标量字段（取优 / 特殊合并） ──
  for (const field of Object.keys(FUSION_TABLE) as (keyof FusedFields)[]) {
    if (manual.has(field)) continue // 人工锁定：跳过，保留 Work 现有值

    if (field === "aliases") {
      // 多源合并去重（union）
      const set = new Set<string>()
      for (const priorityKey of FUSION_TABLE[field]) {
        const data = byKey.get(priorityKey)
        if (!data?.aliases) continue
        for (const a of data.aliases) {
          const t = a.trim()
          if (t) set.add(t)
        }
      }
      if (set.size > 0) {
        fields.aliases = Array.from(set).join(", ")
        provenance.aliases = { source: FUSION_TABLE.aliases[0], manual: false }
      }
      continue
    }

    if (field === "description") {
      // 取最长非空
      let best = ""
      let bestKey: SourceKey = FUSION_TABLE.description[0]
      for (const priorityKey of FUSION_TABLE.description) {
        const val = byKey.get(priorityKey)?.description
        if (isNonEmpty(val) && val.length > best.length) {
          best = val
          bestKey = priorityKey
        }
      }
      if (best) {
        fields.description = best
        provenance.description = { source: bestKey, manual: false }
      }
      continue
    }

    // 其余字段：按优先级取首个非空
    for (const priorityKey of FUSION_TABLE[field]) {
      const val = byKey.get(priorityKey)?.[field]
      if (isNonEmpty(val)) {
        fields[field] = val as never
        provenance[field] = { source: priorityKey, manual: false }
        break
      }
    }
  }

  // ── 标签：多源 name 去重合并，保留首个 sourceId ──
  const tagMap = new Map<string, { name: string; sourceId?: string }>()
  for (const s of sources) {
    for (const t of s.data.tags ?? []) {
      const key = t.name.trim().toLowerCase()
      if (!key) continue
      if (!tagMap.has(key)) tagMap.set(key, { name: t.name.trim(), sourceId: t.sourceId })
    }
  }
  const tags = Array.from(tagMap.values())

  // ── 创作者：按 (name, role) 去重；同人不同角色累加；信息更完整者胜出 ──
  const creatorMap = new Map<string, { name: string; role: string; sourceId?: string; nameJa?: string }>()
  for (const s of sources) {
    for (const c of s.data.creators ?? []) {
      const name = c.name.trim()
      if (!name) continue
      const role = (c.role || "other").trim()
      const key = `${name.toLowerCase()}::${role.toLowerCase()}`
      const existing = creatorMap.get(key)
      if (!existing) {
        creatorMap.set(key, { name, role, sourceId: c.sourceId, nameJa: c.nameJa })
      } else if (!existing.nameJa && c.nameJa) {
        // 补充更完整的原名信息
        creatorMap.set(key, { ...existing, nameJa: c.nameJa })
      }
    }
  }
  const creators = Array.from(creatorMap.values())

  return { fields, provenance, tags, creators }
}

export { splitAliases }
