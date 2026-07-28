/**
 * Galvelica 源适配器注册表（Stage B）
 *
 * 单一入口：融合引擎（Stage D）/ 后台导入只需 `getAdapter(key)` 即可拿到对应适配器，
 * 无需 import 具体实现。新增数据源（Bangumi / ErogameScape / DLsite / Steam）时，
 * 在此注册并实现 SourceAdapter 即可，调用方零改动。
 */
import type { SourceAdapter, SourceKey } from "./types"
import { vndbAdapter } from "./vndb"
import { bangumiAdapter } from "./bangumi"
import { ymgalAdapter } from "./ymgal"
import { cngalAdapter } from "./cngal"
import { steamAdapter } from "./steam"
import { erogesapeAdapter } from "./egs"

const registry: Partial<Record<SourceKey, SourceAdapter>> = {
  VNDB: vndbAdapter,
  BANGUMI: bangumiAdapter, // Stage D：未配置 BANGUMI_ACCESS_TOKEN 时优雅降级
  YMGAL: ymgalAdapter, // 月幕：未启用，保留适配器
  CNGL: cngalAdapter, // CnGal：未启用，保留适配器
  STEAM: steamAdapter, // Steam 商店：发现层（VN genre 校验后建 Work）
  EROGESCAPE: erogesapeAdapter, // 日本权威 galge 库；默认不摄入（GALVELICA_ENABLE_EGS=1 开启，需服务器出口代理）
  // DLSITE: dlsiteAdapter,
}

export function getAdapter(key: SourceKey): SourceAdapter | undefined {
  return registry[key]
}

export function listAdapters(): SourceKey[] {
  return Object.keys(registry) as SourceKey[]
}

export { vndbAdapter, bangumiAdapter, ymgalAdapter, cngalAdapter, steamAdapter, erogesapeAdapter }
export type { SourceAdapter, SourceKey, NormalizedWork } from "./types"
