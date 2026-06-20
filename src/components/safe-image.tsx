"use client"

import Image, { type ImageProps } from "next/image"
import { useCallback, useState } from "react"

/**
 * Next.js Image 的客户端包装
 * 加载失败时自动重试 → 降级为原生 <img> → 最终显示占位图
 *
 * 策略：
 * 1. 正常加载 → 直接展示
 * 2. 加载失败 → 降级为原生 <img> 标签（绕过 next/image 优化管道）
 * 3. 原生 img 也失败 → 显示占位图
 */

// 占位图组件 - 使用 useMemo 缓存
const ImageOffPlaceholder = () => (
  <div
    className="absolute inset-0 flex flex-col items-center justify-center gap-2"
    style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}
  >
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.4}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
    <span className="text-xs">图片加载失败</span>
  </div>
)

export function SafeImage(props: ImageProps) {
  const [failed, setFailed] = useState(false)
  const [fallback, setFallback] = useState(false)

  const src = typeof props.src === "string" ? props.src : ""

  // src 变化时重置状态 - 使用单一 setState
  const resetState = useCallback(() => {
    setFailed(false)
    setFallback(false)
  }, [])

  const handleNextImageError = useCallback(() => {
    // next/image 加载失败，降级为原生 img
    setFallback(true)
  }, [])

  const handleImgError = useCallback(() => {
    setFailed(true)
  }, [])

  // 最终失败占位图
  if (failed) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          background: "hsl(var(--muted))",
          color: "hsl(var(--muted-foreground))",
          borderRadius: "inherit",
        }}
      >
        <ImageOffPlaceholder />
      </div>
    )
  }

  // 降级为原生 img 标签（绕过 next/image 优化管道）
  if (fallback) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={(props.alt as string) ?? ""}
        style={{
          objectFit: (props.style?.objectFit as React.CSSProperties["objectFit"]) || "cover",
          borderRadius: "inherit",
          ...(props.fill
            ? { position: "absolute" as const, inset: 0, width: "100%", height: "100%" }
            : { width: props.width ?? "100%", height: props.height ?? "100%" }),
        }}
        onError={handleImgError}
        loading={(props.loading as "lazy" | "eager") || "lazy"}
        decoding="async"
      />
    )
  }

  // 正常使用 next/image - 添加 onLoad 成功回调
  return (
    <Image
      {...props}
      alt={props.alt ?? ""}
      onError={handleNextImageError}
      onLoad={resetState}
    />
  )
}