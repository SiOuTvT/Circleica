import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface AdminPageHeaderProps {
  /** 英文小标签，与全站 ArchiveHero 同源（uppercase + tracking-[0.2em]） */
  eyebrow?: string
  /** 页面主标题 */
  title: string
  /** 标题下方的说明 / 元信息（可为 ReactNode，如计数徽标） */
  description?: ReactNode
  /** 右侧操作区（如「新增」按钮、搜索框） */
  action?: ReactNode
  className?: string
}

/**
 * AdminPageHeader — 后台统一页头。
 *
 * 与全站 ArchiveHero（浏览页分支）同源：
 *  - eyebrow：text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground
 *  - H1：font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl
 *  - 标题下方留白，整体与前台 Archive 系统一致，让整站像一个产品。
 *
 * 纯 Server Component，后台服务端页面可直接使用。
 */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="break-words font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <div className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {description}
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
