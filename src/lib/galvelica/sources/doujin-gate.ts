/**
 * 严格同人闸门（Galvelica 不变式：「只收同人 VN」）
 *
 * - 默认 DOUJIN_ONLY=1：仅收录「带同人标签」的源。
 *   当前白名单 DOUJIN_CURATED = VNDB / BANGUMI / STEAM。
 *   - VNDB：核心权威源（全球公认，按生产者类型 ng/in 判同人 + 同人系公司白名单）；
 *   - BANGUMI：中文译名/别名质量高；
 *   - STEAM：仅放行 VN 类型，补漏网新同人。
 * - 设为 0（GALVELICA_DOUJIN_ONLY=0）：放开其它「galge 广义」源（当前无其它已接线源）。
 *
 * 月幕(YmGal) / CnGal / KunMoe 已从白名单移除，gate 直接拦截。
 *
 * 各源在入库口调用 gateAllowsSource() 自审；不允许的源直接跳过（不建 Work）。
 */
import type { SourceKey } from "./types"

/** 是否严格只收同人（默认 true）。 */
export function isDoujinOnly(): boolean {
  return process.env.GALVELICA_DOUJIN_ONLY !== "0"
}

/** 带同人标签、能可靠判定同人的源（严格模式下也收录）。 */
const DOUJIN_CURATED: SourceKey[] = ["VNDB", "BANGUMI", "STEAM"]

/**
 * 该源当前是否被闸门放行。
 * 返回 [allowed, reason]。
 */
export function gateAllowsSource(key: SourceKey): [boolean, string] {
  if (DOUJIN_CURATED.includes(key)) return [true, "doujin-curated"]
  if (isDoujinOnly()) {
    return [false, `${key} 是 galge 广义源，严格同人模式下跳过（设 GALVELICA_DOUJIN_ONLY=0 放开）`]
  }
  return [true, "galge-broad (DOUJIN_ONLY=0)"]
}

/** 简明判定：该源是否被放行。 */
export function sourceAllowed(key: SourceKey): boolean {
  return gateAllowsSource(key)[0]
}
