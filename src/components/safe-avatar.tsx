"use client"

import { getRandomAvatarColor } from "@/lib/utils"
import { useMemo, useState } from "react"

/**
 * 带 onError 降级的头像组件
 * 图片加载失败时自动降级为首字母头像
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

  // 仅在 src 变化时重新生成 cache-busted URL，避免每次渲染都刷新图片
  const cacheBustedSrc = useMemo(
    () => `${src}${src.includes("?") ? "&" : "?"}t=${Date.now()}`,
    [src],
  )

  if (!src || error) {
    return (
      <div
        className="flex items-center justify-center rounded-full text-white font-bold"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.35,
          backgroundColor: getRandomAvatarColor(alt),
        }}
      >
        {alt[0]?.toUpperCase() || "?"}
      </div>
    )
  }

  return (
    <img
      src={cacheBustedSrc}
      alt={alt}
      className={`object-cover rounded-full ${className || ""}`}
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  )
}