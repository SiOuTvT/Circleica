import type { GameCardData } from "@/components/game-card"

const KEY = "circleica_recently_viewed"
const MAX = 12

/** 记录一个浏览过的游戏（只存卡片渲染所需字段，避免体积膨胀） */
export function pushRecentlyViewed(game: GameCardData) {
  if (typeof window === "undefined") return
  try {
    const prev = getRecentlyViewed()
    const next: GameCardData[] = [
      game,
      ...prev.filter((g) => g.id !== game.id),
    ].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* localStorage 不可用时静默 */
  }
}

/** 读取最近浏览列表（客户端专用） */
export function getRecentlyViewed(): GameCardData[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as GameCardData[]) : []
  } catch {
    return []
  }
}

/** 清空浏览记录（客户端专用） */
export function clearRecentlyViewed() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* localStorage 不可用时静默 */
  }
}
