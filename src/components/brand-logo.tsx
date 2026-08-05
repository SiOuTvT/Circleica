import { type ResolvedLogo } from "@/lib/branding"

/**
 * 统一渲染品牌 Logo，自动按全局主题（.dark / .light）切换彩色 / 反白版本。
 *
 * - full 模式：完整 lockup（图形 + 文字 baked）。
 *   · 默认图：浅色用彩版、深色用反白版（两份 PNG 切换）。
 *   · 自定义图（isCustom）：浅色用原图、深色用 `brightness-0 invert` 兜底变白剪影。
 * - icon 模式：emblem 符号，浅色彩版 / 深色反白版切换。
 *
 * 调用方通过 `className` 控制尺寸与宽高策略：
 *   · lockup 用 `h-10 w-auto max-w-full`（宽图，固定高、宽自适应、不溢出容器）
 *   · emblem 用 `h-12 w-12`（方形，固定宽高）
 * 切勿对 lockup 使用 `object-cover`（会裁切文字）。
 *
 * `forceVariant`：强制渲染浅色/深色版本（用于后台预览卡，使其在局部背景上正确显示，
 * 而不受全局 .dark/.light 影响）。
 */
export function BrandLogo({
  brand,
  className = "",
  alt = "",
  forceVariant,
}: {
  brand: ResolvedLogo
  className?: string
  alt?: string
  forceVariant?: "light" | "dark"
}) {
  const cls = `shrink-0 object-contain ${className}`

  // 强制浅色版本
  if (forceVariant === "light") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.lightSrc} alt={alt} className={cls} />
  }

  // 强制深色版本（自定义图无反白版，用 filter 兜底变白）
  if (forceVariant === "dark") {
    if (brand.isCustom) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={brand.lightSrc} alt={alt} className={`${cls} brightness-0 invert`} />
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.darkSrc} alt={alt} className={cls} />
  }

  // 默认：跟随全局主题切换
  if (brand.isCustom) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.lightSrc} alt={alt} className={`${cls} dark:brightness-0 dark:invert`} />
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.lightSrc} alt={alt} className={`${cls} dark:hidden`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.darkSrc} alt={alt} className={`${cls} hidden dark:block`} />
    </>
  )
}
