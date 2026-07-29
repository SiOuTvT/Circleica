/**
 * Galvelica 源适配器接口契约（ADR §4）
 *
 * 每个数据源（VNDB / Bangumi / ErogameScape / DLsite / Steam / 人工）实现统一接口，
 * 融合引擎（Stage D）与具体源完全解耦。新增数据源只需实现本接口并在 registry 注册，
 * 融合引擎零改动即可接入。
 */

/**
 * 数据源键。必须与 Stage A 的 `WorkSourceType` Prisma 枚举值完全一致，
 * 否则 WorkSource.source 无法映射。
 */
export type SourceKey =
  | "VNDB"
  | "BANGUMI"
  | "CNGL"
  | "YMGAL"
  | "EROGESCAPE"
  | "DLSITE"
  | "STEAM"
  | "MANUAL"

/**
 * 源无关的作品归一化结构。
 * 适配器把各源原始 payload 转换成此形状，融合引擎（Stage D）按字段级优先级表选优合并。
 */
export interface NormalizedWork {
  title?: string
  /** 原名 / 日文官方名 */
  originalWork?: string
  englishName?: string
  /** 非主推名称的其余别名（已去重） */
  aliases?: string[]
  description?: string
  coverImage?: string
  /** 游戏时长（VNDB length 1-5 映射后的可读文本，如「中等 (约 10–30 小时)」） */
  gameDuration?: string
  /** 截图 URL 列表（VNDB screenshots{id,url}） */
  screenshots?: string[]
  /** ISO 字符串，如 "2023-04-28" / "2023-04" */
  releaseDate?: string
  /** 开发社团（可多个，逗号分隔） */
  studioName?: string
  tags?: { name: string; sourceId?: string }[]
  creators?: {
    name: string
    role: string
    /** 源内创作者 ID（VNDB staff id 去掉 s 前缀） */
    sourceId?: string
    /** VNDB 提供的原文名（日文等），Bangumi 等可能无 */
    nameJa?: string
  }[]
  /** 官方购买链接（DLsite 优先，见融合表） */
  officialUrl?: string
  /** Steam app id（Steam 优先） */
  steamAppId?: string
  /** 支持平台代码（VNDB platforms：win/lin/mac/ios/and/psp/ps2/drc/vnd/web/mob…） */
  platforms?: string[]
  /** 官方网站（VNDB 无干净官网字段，保留接口位，由人工填写） */
  officialWebsite?: string
}

/**
 * 数据源适配器。
 * - fetchByExternalId：按外部 ID 拉取原始 payload（缓存进 WorkSource.raw，由调用方负责）
 * - normalize：把原始 payload 归一为源无关结构
 * - search（可选）：按标题搜索，用于「用户给了作品名但无 ID」的场景
 */
export interface SourceAdapter {
  readonly key: SourceKey
  fetchByExternalId(externalId: string): Promise<unknown | null>
  normalize(payload: unknown): NormalizedWork
  search?(query: string): Promise<{ externalId: string; title: string }[]>
}
