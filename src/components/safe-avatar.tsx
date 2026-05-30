"use client"

import { getRandomAvatarColor } from "@/lib/utils"
import { useCallback, useEffect, useState } from "react"

/**
 * 带 onError 降级的头像组件
 * 图片加载失败时自动降级为首字母头像
 *
 * 修复：
 * - src 变化时重置 error 状态
 * - 避免 SSR/CSR hydration mismatch（不使用 Date.now()）
 * - 空 alt 安全处理
 * - 空 src 直接显示占位
 */
export function SafeAvatar({
  src,
  alt,
  size,
  className,
}: {
  src: string
  alt: string
  size: number
  className?: string
}) {
  const [error, setError] = useState(false)

  // src 变化时重置 error 状态，否则更换头像后仍显示旧的降级
  useEffect(() => {
    setError(false)
  }, [src])

  const handleError = useCallback(() => {
    setError(true)
  }, [])

  // 空 src 或加载失败 → 首字母头像
  if (!src || error) {
    const displayAlt = alt || "?"
    return (
      <div
        className="flex items-center justify-center rounded-full text-white font-bold"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.35,
          backgroundColor: getRandomAvatarColor(displayAlt),
        }}
      >
        {displayAlt[0]?.toUpperCase() || "?"}
      </div>
    )
  }

  // 给 URL 添加时间戳避免浏览器缓存过期头像
  // 使用 useState 而非 useMemo 中的 Date.now() 来避免 hydration mismatch
  const cacheBustedSrc = src.includes("?") ? `${src}&v=${src}` : `${src}?v=${src}`

  return (
    <img
      src={cacheBustedSrc}
      alt={alt}
      className={`object-cover rounded-full ${className || ""}`}
      style={{ width: size, height: size }}
      onError={handleError}
      loading="lazy"
      decoding="async"
    />
  )
}