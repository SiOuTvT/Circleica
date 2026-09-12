"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { adminBtnPrimary } from "@/lib/admin-styles"
import { cn } from "@/lib/utils"

/**
 * 「下一步」空态引导：渲染在空态下方——一句话说清这页会有什么 + 一个主操作（有则跳，无则省）。
 * 支持两种主操作：href（跳转）或 onAction（就地打开新建/编辑）。低调、无装饰，仅作引导。
 */
export function AdminEmptyNext({
  children,
  href,
  actionLabel,
  onAction,
}: {
  children: ReactNode
  /** 跳转去向；有明确去向时给，没有就省略 */
  href?: string
  /** 就地动作（如打开新建弹窗）；无 href 时用 */
  onAction?: () => void
  actionLabel?: string
}) {
  const showAction = !!actionLabel && (!!href || !!onAction)
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{children}</p>
      {showAction &&
        (href ? (
          <Link href={href} className={cn(adminBtnPrimary, "h-10")}>
            {actionLabel}
          </Link>
        ) : (
          <button type="button" onClick={onAction} className={cn(adminBtnPrimary, "h-10")}>
            {actionLabel}
          </button>
        ))}
    </div>
  )
}
