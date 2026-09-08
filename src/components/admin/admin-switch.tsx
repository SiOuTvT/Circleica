"use client"

import { cn } from "@/lib/utils"

/**
 * AdminSwitch — 后台统一开关（后台专用，不进 src/components/ui）。
 * 统一规格：轨道 40x22、旋钮 18x18、开启位移 20px、关闭位移 2px。
 * 键盘可达：原生 button + role="switch" + aria-checked。
 */
export function AdminSwitch({
  checked,
  onChange,
  disabled,
  label,
  className,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  /** 无障碍名称；也用作 aria-label */
  label?: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full ring-1 ring-border transition-colors duration-200",
        checked ? "bg-primary" : "bg-muted-foreground/30",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      <span
        className={cn(
          "block h-[18px] w-[18px] rounded-full bg-white shadow ring-0 transition-transform duration-200",
          checked ? "translate-x-[20px]" : "translate-x-[2px]",
        )}
      />
    </button>
  )
}
