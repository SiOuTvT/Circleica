/**
 * 首页品牌区统计缓存工具
 *
 * 首页「个游戏 / 本周新增 / 今日签到」等统计在 (home)/page.tsx 中带 5 分钟缓存渲染。
 * 当发生会改变这些数字的写操作（签到、发布游戏等）时，调用 invalidateHomeStats()
 * 主动失效缓存，配合客户端 router.refresh() 即可让品牌区即时反映最新数据，
 * 避免用户「签到了但数字不变、必须手动硬刷新」的体验缺陷。
 */

import { cache, cacheKey } from "./redis"
import { toShanghaiDate } from "./date"

/** 首页统计缓存 key（按 Asia/Shanghai 日期 + nsfw 状态区分，与首页渲染保持一致） */
export function homeStatsCacheKey(nsfw: boolean, date: Date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return cacheKey("homepage:stats", toShanghaiDate(d), nsfw ? "1" : "0")
}

/** 失效首页统计缓存（两种 nsfw 变体一并清除）。内部吞掉异常，绝不因缓存失败阻断主流程。 */
export async function invalidateHomeStats(): Promise<void> {
  await Promise.all([
    cache.del(homeStatsCacheKey(false)),
    cache.del(homeStatsCacheKey(true)),
  ]).catch(() => {})
}
