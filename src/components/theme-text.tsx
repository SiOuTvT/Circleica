"use client"

import { cn } from "@/lib/utils"

/**
 * 主题感知的文字容器
 * 使用 CSS 变量 text-foreground 自动适配深浅色模式
 */
export function ThemeText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("text-foreground", className)}>
      {children}
    </div>
  )
}