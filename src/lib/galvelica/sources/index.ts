/**
 * Galvelica 源适配器注册表（Stage B）
 *
 * 单一入口：融合引擎（Stage D）/ 后台导入只需 `getAdapter(key)` 即可拿到对应适配器，
 * 无需 import 具体实现。新增数据源时在此注册并实现 SourceAdapter 即可，调用方零改动。
 *
 * 注意：国内三源（CnGal / 月幕 / Bangumi）已按计划彻底移除调用逻辑——本注册表不再
 * 注册任何国内源适配器，正式镜像无任何调用国内接口的入口。SourceKey 类型中仍保留
 * BANGUMI / CNGL / YMGAL 枚举值仅为存量数据迁移兼容，已无任何代码路径主动使用。
 */
import type { SourceAdapter, SourceKey } from "./types"
import { vndbAdapter } from "./vndb"
import { steamAdapter } from "./steam"
import { erogesapeAdapter } from "./egs"
import { dlsiteAdapter } from "./dlsite"
import { getchuAdapter } from "./getchu"
import { fuwanovelAdapter } from "./fuwanovel"
import { boothAdapter } from "./booth"

const registry: Partial<Record<SourceKey, SourceAdapter>> = {
  VNDB: vndbAdapter, // 核心主源：定时自动增量同步
  STEAM: steamAdapter, // Steam 商店：发现层（VN genre 校验后建 Work）
  EROGESCAPE: erogesapeAdapter, // 日本权威 galge 库；默认不摄入（GALVELICA_ENABLE_EGS=1 开启，需服务器出口代理）
  DLSITE: dlsiteAdapter, // 抓取型，仅手动补查（R-18 ToS 注意）
  GETCHU: getchuAdapter, // 抓取型，仅手动补查（需 cookie 越年龄确认）
  FUWANOVEL: fuwanovelAdapter, // 抓取型，结构脆弱，仅手动补查
  BOOTH: boothAdapter, // 经 Pixiv OAuth，仅手动补查，未配置 token 优雅降级
}

export function getAdapter(key: SourceKey): SourceAdapter | undefined {
  return registry[key]
}

export function listAdapters(): SourceKey[] {
  return Object.keys(registry) as SourceKey[]
}

export {
  vndbAdapter,
  steamAdapter,
  erogesapeAdapter,
  dlsiteAdapter,
  getchuAdapter,
  fuwanovelAdapter,
  boothAdapter,
}
export type { SourceAdapter, SourceKey, NormalizedWork } from "./types"
