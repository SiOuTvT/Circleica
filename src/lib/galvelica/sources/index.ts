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

const registry: Partial<Record<SourceKey, SourceAdapter>> = {
  VNDB: vndbAdapter,
  BANGUMI: bangumiAdapter, // Stage D：未配置 BANGUMI_ACCESS_TOKEN 时优雅降级
  // EROGESCAPE: erogescapeAdapter,
  // DLSITE: dlsiteAdapter,
  // STEAM: steamAdapter,
}

export function getAdapter(key: SourceKey): SourceAdapter | undefined {
  return registry[key]
}

export function listAdapters(): SourceKey[] {
  return Object.keys(registry) as SourceKey[]
}

export { vndbAdapter, bangumiAdapter }
export type { SourceAdapter, SourceKey, NormalizedWork } from "./types"
