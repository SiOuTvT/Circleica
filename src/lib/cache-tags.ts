/**
 * 缓存 tag 统一命名（B-13）：所有 revalidateTag / unstable_cache tags 的唯一来源。
 * 集中定义，避免散落字符串拼写出错、重命名遗漏导致缓存失效失效。
 */

export const CacheTag = {
  gameDetail: "game-detail",
  siteSettings: "site-settings",
  adminTagsPrefix: "circleica:admin:tags:",
} as const

/** 单游戏详情缓存 tag（与 games.ts 中 revalidateTag(`game:${id}`) 对齐） */
export function gameTag(id: string): string {
  return `game:${id}`
}
