"use client"

import Image, { type ImageProps } from "next/image"
import { useCallback, useState } from "react"

// 已知托管在 CDN 上的远程图域名（与 next.config.ts remotePatterns 对齐）。
// 这些 CDN 本身已做图片优化，Next 在应用服务器上二次编码 AVIF 是弱机上最贵开销，
// 故对它们直出（unoptimized）跳过应用服务器编码；仅本地 /uploads 走 Next 优化。
//
// 例外：VNDB 图床（static/t/s.vndb.org）原图体积大、无服务端缓存，直出会导致副站
// 图片加载极慢。这里改走 Next 优化（自动缩尺寸 + WebP/AVIF + 31 天磁盘缓存），
// 首屏明显变快；若 VNDB 拦截服务端抓取，SafeImage 会自动降级为原生 <img> 直连，不丢图。
const REMOTE_CDN_HOSTS = new Set([
  "utfs.io",
  "uploadthing.com",
  "shared.cdn.queniuqe.com",
  "media.st.dl.eccdnx.com",
  "shared.cloudflare.steamstatic.com",
  "cdn.cloudflare.steamstatic.com",
  "shared.akamai.steamstatic.com",
  "store.steampowered.com",
  "bgm.tv",
  "lain.bgm.tv",
])

function isRemoteCdn(src: string): boolean {
  try {
    const u = new URL(src)
    if (u.protocol !== "https:") return false
    const h = u.hostname
    return (
      h === "r2.dev" ||
      h.endsWith(".r2.dev") ||
      h === "r2.cloudflarestorage.com" ||
      h.endsWith(".r2.cloudflarestorage.com") ||
      REMOTE_CDN_HOSTS.has(h)
    )
  } catch {
    return false
  }
}

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
    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground"
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
      unoptimized={props.unoptimized ?? isRemoteCdn(src)}
      onError={handleNextImageError}
      onLoad={resetState}
    />
  )
}