"use client"

import { useEffect } from "react"

/**
 * 后台客户端组件（"use client"）无法使用 export const metadata，
 * 用此轻量 helper 在挂载时同步 document.title，使浏览器标签与页面 h1 一致。
 */
export function DocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title
  }, [title])
  return null
}
