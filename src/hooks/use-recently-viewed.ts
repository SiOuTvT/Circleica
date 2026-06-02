"use client"

import { useCallback, useState } from "react"

export interface RecentGame {
  id: string
  title: string
  coverImage?: string | null
  /** ISO 时间戳 */
  viewedAt: string
}

const STORAGE_KEY = "recently-viewed"
const MAX_ITEMS = 20

/**
 * 最近浏览游戏记录 — localStorage
 *
 * 用法：
 *   const { recentGames, addRecent, clearRecent } = useRecentlyViewed()
 */
export function useRecentlyViewed() {
  const [recentGames, setRecentGames] = useState<RecentGame[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  /** 添加一条浏览记录（去重 + 时间更新） */
  const addRecent = useCallback(
    (game: { id: string; title: string; coverImage?: string | null }) => {
      setRecentGames((prev) => {
        const filtered = prev.filter((g) => g.id !== game.id)
        const updated: RecentGame[] = [
          {
            id: game.id,
            title: game.title,
            coverImage: game.coverImage,
            viewedAt: new Date().toISOString(),
          },
          ...filtered,
        ].slice(0, MAX_ITEMS)

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch {
          // ignore
        }
        return updated
      })
    },
    [],
  )

  /** 清空浏览记录 */
  const clearRecent = useCallback(() => {
    setRecentGames([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  return { recentGames, addRecent, clearRecent }
}