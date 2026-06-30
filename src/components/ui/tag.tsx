import { cn } from "@/lib/utils"
import Link from "next/link"
import type { ReactNode } from "react"

/*
 * ═══════════════════════════════════════════════
 *  Tag Design System
 * ═══════════════════════════════════════════════
 *
 *  三种变体，覆盖全站所有标签场景：
 *
 *  content  — 内容标签（游戏标签、论坛分类、资源标签、角色标签等）
 *             圆角: rounded-lg, 高密度手机端
 *
 *  cloud    — 标签云 / 标签浏览（可点击、大量排列、筛选用）
 *             圆角: rounded-full, 药丸形
 *
 *  badge    — 状态/计数徽章（NEW、通知数字、数量标记）
 *             圆角: rounded-full, 最小尺寸
 *
 *  颜色方案统一：
 *    背景: color + 9% 透明度
 *    文字: color 原色
 *    边框: color + 19% 透明度
 * ═══════════════════════════════════════════════
 */

type TagVariant = "content" | "cloud" | "badge"

interface TagBaseProps {
  variant?: TagVariant
  /** 标签颜色（hex），不传则使用默认主题色 */
  color?: string
  className?: string
  children: ReactNode
}

interface TagProps extends TagBaseProps {
  /** 传入 href 时渲染为 Link */
  href?: string
  /** Link 点击回调 */
  onClick?: () => void
  title?: string
}

/* ── 样式 token ── */

const variantStyles: Record<TagVariant, string> = {
  content: cn(
    // 手机端: px-2 无垂直padding, 桌面端: px-2.5 py-1
    "inline-flex items-center shrink-0",
    "rounded-lg",
    "px-2 sm:px-2.5 sm:py-1",
    "text-xs font-semibold",
    "transition-colors",
  ),
  cloud: cn(
    // 手机端: px-2.5 py-0.5, 桌面端: px-3 py-1
    "inline-flex items-center shrink-0",
    "rounded-full",
    "px-2.5 py-0.5 sm:px-3 sm:py-1",
    "text-xs font-medium",
    "transition-all hover:scale-[1.03]",
  ),
  badge: cn(
    "inline-flex items-center shrink-0",
    "rounded-full",
    "px-1.5 py-px",
    "text-[10px] font-bold leading-none",
  ),
}

/**
 * 生成标签的内联颜色样式
 */
function tagColorStyle(color?: string, variant?: TagVariant): React.CSSProperties | undefined {
  if (!color) return undefined
  if (variant === "badge") {
    // badge 用更深的背景
    return {
      backgroundColor: `${color}20`,
      color,
    }
  }
  return {
    backgroundColor: `${color}18`,
    color,
    border: `1px solid ${color}30`,
  }
}

/**
 * Tag 组件 — 全站统一标签
 */
export function Tag({
  variant = "content",
  color,
  className,
  href,
  onClick,
  title,
  children,
}: TagProps) {
  const style = tagColorStyle(color, variant)
  const classes = cn(variantStyles[variant], className)

  if (href) {
    return (
      <Link href={href} className={classes} style={style} title={title}>
        {children}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} style={style} title={title}>
        {children}
      </button>
    )
  }

  return (
    <span className={classes} style={style} title={title}>
      {children}
    </span>
  )
}

/**
 * 便捷组件：带颜色背景的标签（用于标签云等场景）
 */
export function ColorTag({
  color,
  variant = "cloud",
  className,
  href,
  title,
  children,
}: Omit<TagBaseProps, "variant"> & { variant?: "content" | "cloud"; href?: string; title?: string }) {
  return (
    <Tag variant={variant} color={color} className={className} href={href} title={title}>
      {children}
    </Tag>
  )
}

/* ── 容器组件：统一流式布局 ── */

interface TagGroupProps {
  variant?: TagVariant
  className?: string
  children: ReactNode
}

/**
 * TagGroup — 标签组容器
 * 统一 gap 和 flex-wrap 行为
 */
export function TagGroup({ variant = "content", className, children }: TagGroupProps) {
  const gapClass = variant === "cloud"
    ? "gap-x-2 gap-y-1.5 sm:gap-x-3 sm:gap-y-2"
    : variant === "badge"
      ? "gap-1"
      : "gap-1 sm:gap-1.5"

  return (
    <div className={cn("flex flex-wrap items-center", gapClass, className)}>
      {children}
    </div>
  )
}
