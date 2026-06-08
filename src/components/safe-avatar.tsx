"use client"

import { getRandomAvatarColor } from "@/lib/utils"
import Image from "next/image"
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

  // src 变化时重置 error 状态
   
  useEffect(() => { setError(false) }, [src])

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

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`object-cover rounded-full ${className || ""}`}
      onError={handleError}
      loading="lazy"
      decoding="async"
      unoptimized
    />
  )
}