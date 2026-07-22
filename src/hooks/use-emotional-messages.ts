"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetchSafe } from "@/lib/api-client"

interface EmMsg {
  id: string
  key: string
  category: string
  title: string
  subtitle: string
  imageUrl: string
  emoji: string
  enabled: boolean
}

let cachedMessages: EmMsg[] | null = null
let fetchPromise: Promise<EmMsg[]> | null = null

async function loadMessages(): Promise<EmMsg[]> {
  if (cachedMessages) return cachedMessages
  if (fetchPromise) return fetchPromise

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  fetchPromise = apiFetchSafe<EmMsg[]>("/api/emotional-messages", { signal: controller.signal })
    .then((result) => {
      clearTimeout(timeoutId)
      const json = result.ok ? result.data : { data: [] }
      const arr = Array.isArray(json) ? json : (json?.data ?? [])
      cachedMessages = arr
      return arr
    })
    .catch(() => {
      clearTimeout(timeoutId)
      fetchPromise = null
      return []
    })

  return fetchPromise
}

/**
 * 获取情感消息 hook
 * @param key 消息的 key，如 "favorite_added"、"empty_comments"
 * @returns { message, loading } - message 包含 title/subtitle/emoji/imageUrl
 */
export function useEmotionalMessage(key: string) {
  const [message, setMessage] = useState<EmMsg | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadMessages().then((msgs) => {
      if (cancelled) return
      const found = msgs.find((m) => m.key === key) ?? null
      setMessage(found)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [key])

  return { message, loading }
}

/**
 * 批量获取情感消息 hook
 * @param keys 消息 key 数组
 * @returns { messages, loading } - messages 是 key → EmMsg 的映射
 */
export function useEmotionalMessages(keys: string[]) {
  const [messages, setMessages] = useState<Record<string, EmMsg>>({})
  const [loading, setLoading] = useState(true)
  const keysKey = useMemo(() => keys.join(","), [keys])

  useEffect(() => {
    let cancelled = false
    loadMessages().then((msgs) => {
      if (cancelled) return
      const map: Record<string, EmMsg> = {}
      for (const key of keys) {
        const found = msgs.find((m) => m.key === key)
        if (found) map[key] = found
      }
      setMessages(map)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [keysKey])

  return { messages, loading }
}

/**
 * 获取情感消息的纯函数版本（用于非 React 上下文）
 * 返回缓存的数据，如果没加载过则返回 null
 */
export function getCachedEmotionalMessage(key: string): EmMsg | null {
  return cachedMessages?.find((m) => m.key === key) ?? null
}
