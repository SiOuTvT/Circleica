import type { ButtonHTMLAttributes } from "react"

import { cn } from "@/lib/utils"
import {
  adminBtnDanger,
  adminBtnPrimary,
  adminBtnSecondary,
  adminBtnSubtle,
} from "@/lib/admin-styles"

type AdminButtonVariant = "primary" | "secondary" | "danger" | "subtle"

const variantClass: Record<AdminButtonVariant, string> = {
  primary: adminBtnPrimary,
  secondary: adminBtnSecondary,
  danger: adminBtnDanger,
  subtle: adminBtnSubtle,
}

/**
 * AdminButton — 后台按钮的轻量类型化封装，套用现有 adminBtn* token。
 * 纯 Server Component（无内置交互）。页面也可直接使用 token。
 */
export function AdminButton({
  variant = "primary",
  galvelica,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant
  galvelica?: boolean
}) {
  return <button className={cn(variantClass[variant], className)} {...props} />
}
