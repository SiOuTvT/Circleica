/**
 * 副站质量分（qualityScore 0-100）——「好的往上排」的核心。
 *
 * 公式（与 Work 已入库字段一一对应，纯函数便于 fuseWork 内联 + 全量重算）：
 *   封面 30（有封面 25 + 高清封面宽>=300 加 5）
 *   截图 20（>=5 张 20 / >=2 张 14 / >=1 张 8）
 *   描述 15（>=300 字 15 / >=150 字 10 / >=30 字 5）
 *   元数据 15（平台 4 + 语言 4 + 时长 3 + 官网 3 + 原语言 1）
 *   评分 10（VNDB rating 0-10 直接映射）
 *   热度 10（log10(viewCount+1)×2，10 万浏览封顶）
 *   惩罚：真人实拍/写实 3D（contentFlags: LIVE_ACTION / REALISTIC_3D）−20
 *
 * qualitySignal 存各分项（Json），供后台诊断与调试。
 */

export interface QualityInput {
  coverImage: string
  coverDims?: { width: number; height: number } | null
  screenshots: unknown
  description: string
  platforms: unknown
  languages: unknown
  duration: string
  officialWebsite: string
  originalLanguage: string
  rating: number | null
  viewCount: number
  favoriteCount: number
  contentFlags?: string[]
}

export interface QualitySignal {
  cover: number
  shots: number
  desc: number
  meta: number
  rating: number
  heat: number
  penalty: number
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

export function computeQualitySignal(work: QualityInput): QualitySignal {
  const shots = asArray(work.screenshots)
  const platforms = asArray(work.platforms)
  const languages = asArray(work.languages)
  const desc = work.description ?? ""
  const flags = work.contentFlags ?? []

  // 封面 30
  let cover = 0
  if (work.coverImage) {
    cover = 25
    const w = work.coverDims?.width ?? 0
    if (w >= 300) cover += 5
  }

  // 截图 20
  let shotsScore = 0
  if (shots.length >= 5) shotsScore = 20
  else if (shots.length >= 2) shotsScore = 14
  else if (shots.length >= 1) shotsScore = 8

  // 描述 15
  let descScore = 0
  const dl = desc.trim().length
  if (dl >= 300) descScore = 15
  else if (dl >= 150) descScore = 10
  else if (dl >= 30) descScore = 5

  // 元数据 15
  let meta = 0
  if (platforms.length > 0) meta += 4
  if (languages.length > 0) meta += 4
  if (work.duration) meta += 3
  if (work.officialWebsite) meta += 3
  if (work.originalLanguage) meta += 1

  // 评分 10
  const rating = typeof work.rating === "number" && work.rating > 0
    ? Math.min(10, Math.max(0, Math.round(work.rating * 10) / 10))
    : 0

  // 热度 10（对数归一，10 万浏览封顶）
  const heat = Math.min(10, Math.round(Math.log10((work.viewCount || 0) + 1) * 2 * 10) / 10)

  // 惩罚：真人实拍 / 写实 3D
  let penalty = 0
  if (flags.includes("LIVE_ACTION") || flags.includes("REALISTIC_3D")) penalty += 20

  return { cover, shots: shotsScore, desc: descScore, meta, rating, heat, penalty }
}

export function computeQualityScore(work: QualityInput): number {
  const s = computeQualitySignal(work)
  return Math.max(0, Math.min(100, Math.round(s.cover + s.shots + s.desc + s.meta + s.rating + s.heat - s.penalty)))
}
