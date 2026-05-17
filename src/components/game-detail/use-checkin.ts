"use client"

import { apiGet, apiPost } from "@/lib/api-client"
import { useCallback, useEffect, useState } from "react"

/**
 * 每日签到 hook
 * 封装签到状态恢复、签到操作、localStorage 缓存
 */
export function useCheckIn(gameId: string, isLoggedIn: boolean, userId?: string) {
  const [checkInDone, setCheckInDone] = useState(false)
  const [checkInLoading, setCheckInLoading] = useState(false)
  const [checkInDays, setCheckInDays] = useState(0)

  const getTodayStr = useCallback(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }, [])

  // 从 localStorage 恢复签到状态
  useEffect(() => {
    if (!isLoggedIn) return
    const storageKey = `checkin_${gameId}_${userId}`
    const stored = localStorage.getItem(storageKey)
    const todayStr = getTodayStr()
    if (stored) {
      try {
        const data = JSON.parse(stored)
        if (data.lastCheckIn === todayStr) {
          setCheckInDone(true)
          setCheckInDays(data.days || 0)
          return
        }
      } catch { /* ignore corrupt data */ }
    }
    apiGet<{ done: boolean; days: number }>(`/api/games/${gameId}/checkin`)
      .then((data) => {
        if (data.done) {
          setCheckInDone(true)
          setCheckInDays(data.days)
          localStorage.setItem(
            storageKey,
            JSON.stringify({ lastCheckIn: todayStr, days: data.days })
          )
        }
      })
      .catch(() => {})
  }, [gameId, isLoggedIn, userId, getTodayStr])

  // 每日签到
  const handleCheckIn = useCallback(async () => {
    if (!isLoggedIn || checkInDone || checkInLoading) return
    setCheckInLoading(true)
    try {
      const data = await apiPost<{ done: boolean; days: number }>(`/api/games/${gameId}/checkin`)
      setCheckInDone(data.done)
      setCheckInDays(data.days)
      if (data.done) {
        const todayStr = getTodayStr()
        const storageKey = `checkin_${gameId}_${userId}`
        localStorage.setItem(
          storageKey,
          JSON.stringify({ lastCheckIn: todayStr, days: data.days })
        )
      }
    } catch { /* ignore */ }
    finally {
      setCheckInLoading(false)
    }
  }, [isLoggedIn, checkInDone, checkInLoading, gameId, userId, getTodayStr])

  return {
    checkInDone,
    checkInLoading,
    checkInDays,
    handleCheckIn,
  }
}