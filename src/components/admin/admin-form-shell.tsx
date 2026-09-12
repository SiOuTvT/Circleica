import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * AdminFormShell — 后台写数据表单的统一版式骨架（纯布局，无任何状态逻辑）。
 *
 * 约定：
 *  - 内容列固定 max-w-[760px]，字段之间统一 gap-4。
 *  - 字段宽度只允许两档：整行（AdminFormField 默认 100%）/ 半行（AdminFormRow 内两列）。
 *    checkbox / 开关保持自身尺寸，不套 AdminFormField 的宽度。
 *  - 保存区统一走 AdminFormActions（sticky 底栏，h-14）。
 *
 * 页面侧用法：<AdminFormShell><AdminFormField…/>…<AdminFormActions>…</AdminFormActions></AdminFormShell>
 */
export function AdminFormShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("flex w-full max-w-[760px] flex-col gap-4", className)}>{children}</div>
}

/** 字段三层结构：label + 控件 + 说明。整行 = 默认 100% 宽度。 */
export function AdminFormField({
  label,
  description,
  htmlFor,
  required,
  className,
  children,
}: {
  label?: ReactNode
  description?: ReactNode
  htmlFor?: string
  required?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
      )}
      {children}
      {description && (
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

/** 半行档：md 以上两列等宽（各半行），<md 落回单列。内部只放 AdminFormField。 */
export function AdminFormRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}>{children}</div>
}

/**
 * 保存区：表单底部固定操作条。
 * sticky bottom-0 + h-14（56px）+ bg-card/95 + backdrop-blur + border-t；右对齐。
 * 页面把「取消」次要按钮与「保存」主要按钮作为 children 传入。
 */
export function AdminFormActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        // [&_button]:h-10 —— 保存条内所有按钮高度统一 40px（内部文字与 gap 不动）
        "sticky bottom-0 z-20 mt-1 flex h-14 items-center justify-end gap-3 border-t border-border bg-card/95 backdrop-blur [&_button]:h-10",
        className,
      )}
    >
      {children}
    </div>
  )
}
