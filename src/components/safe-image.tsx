"use client"

import Image, { type ImageProps } from "next/image"
import { useCallback, useEffect, useState } from "react"

/**
 * Next.js Image 的客户端包装
 * 加载失败时自动重试 → 降级为原生 <img> → 最终显示占位图
 *
 * 策略：
 * 1. 正常加载 → 直接展示
 * 2. 加载失败 → 去掉 optimization 参数重试（可能是 next/image 优化问题）
 * 3. 再失败 → 降级为原生 <img> 标签（绕过 next/image 优化管道）
 * 4. 原生 img 也失败 → 显示占位图
 */
export function SafeImage(props: ImageProps) {
  const [state, setState] = useState<"loading" | "img-fallback" | "failed">("loading")

  const src = typeof props.src === "string" ? props.src : ""

  // 当 src 变化时重置状态
  useEffect(() => {
    setState("loading")
  }, [src])

  const handleNextImageError = useCallback(() => {
    // next/image 加载失败，降级为原生 img
    setState("img-fallback")
  }, [])

  const handleImgError = useCallback(() => {
    setState("failed")
  }, [])

  const handleImgLoad = useCallback(() => {
    // 原生 img 加载成功，保持 img-fallback 状态
  }, [])

  // 最终失败占位图
  if (state === "failed") {
    const fallbackStyle: React.CSSProperties = {
      ...(props.fill
        ? { position: "absolute" as const, inset: 0, width: "100%", height: "100%" }
        : { width: props.width ?? "100%", height: props.height ?? "100%" }),
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      background: "hsl(var(--muted))",
      color: "hsl(var(--muted-foreground))",
      fontSize: 14,
      borderRadius: "inherit",
    }

    return (
      <div style={fallbackStyle}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.4}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span>图片加载失败</span>
      </div>
    )
  }

  // 降级为原生 img 标签（绕过 next/image 优化管道）
  if (state === "img-fallback") {
    const imgStyle: React.CSSProperties = {
      objectFit: props.style?.objectFit as React.CSSProperties["objectFit"] || "cover",
      borderRadius: "inherit",
      ...(props.fill
        ? { position: "absolute" as const, inset: 0, width: "100%", height: "100%" }
        : {}),
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={props.alt as string}
        style={imgStyle}
        onError={handleImgError}
        onLoad={handleImgLoad}
        loading={(props.loading as "lazy" | "eager") || "lazy"}
        decoding="async"
      />
    )
  }

  // 正常使用 next/image
  return <Image {...props} onError={handleNextImageError} />
}