/**
 * Archive 密度与首字分组工具
 *
 * 现实约束：主站多同人，制作组常仅 1~3 部作品。
 * 密度三态（最高优先级令牌）驱动网格列数 / 间距 / 卡片降载：
 *   - 0        → 由 ArchivePlaceholder 走 Empty（不在此返回）
 *   - 1~3      → compact（编辑式大卡，少不空）
 *   - 4~11     → standard
 *   - ≥12      → dense（网格 +1 列，多不乱）
 */

export type ArchiveDensity = "compact" | "standard" | "dense"

/**
 * 网格列数映射（最高优先级密度令牌的 JS 实现）。
 * 统一供 SkeletonGrid / Studio 列表 / Studio 详情（GameCard 网格）复用，
 * 避免密度逻辑在多处手写复制。
 */
export const DENSITY_GRID: Record<ArchiveDensity, string> = {
  compact: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  standard: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  dense: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
}

export function computeDensity(count: number): ArchiveDensity {
  if (count <= 0) return "standard"
  if (count <= 3) return "compact"
  if (count <= 11) return "standard"
  return "dense"
}

/**
 * 取名称首字作为分组 key：
 *  - 拉丁字母 → 大写
 *  - 数字 → #（与符号/标点统一）
 *  - CJK / 假名 → 取首字符（按中文序排序）
 *  - 其它符号/标点 → #（避免索引出现孤立符号键）
 */
export function firstCharKey(name: string): string {
  const s = (name || "").trim()
  if (!s) return "#"
  const ch = s[0]
  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase()
  if (/[0-9]/.test(ch)) return "#"
  if (/[぀-ヿ一-鿿㐀-䶿]/.test(ch)) return ch
  return "#"
}

export interface LetterGroup<T> {
  key: string
  items: T[]
}

/**
 * 按首字分组并排序：A–Z 在前，# 次之，CJK 按中文序。
 * 用于 Studio（及未来 Creator）的 AZIndex 索引浏览。
 */
export function groupByFirstChar<T>(items: T[], getName: (item: T) => string): LetterGroup<T>[] {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const key = firstCharKey(getName(it))
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(it)
  }
  const keys = Array.from(map.keys())
  keys.sort((a, b) => {
    const aL = /^[A-Z]$/.test(a)
    const bL = /^[A-Z]$/.test(b)
    if (aL && bL) return a.localeCompare(b)
    if (aL) return -1
    if (bL) return 1
    if (a === "#" && b !== "#") return 1
    if (b === "#" && a !== "#") return -1
    return a.localeCompare(b, "zh-Hans-CN")
  })
  return keys.map((key) => ({ key, items: map.get(key)! }))
}
