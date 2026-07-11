/**
 * 后台共享样式 Token
 * 统一后台页面的输入框、按钮、卡片等样式，避免各页面各自定义导致碎片化
 */

/** 输入框 — 统一为 rounded-xl + bg-muted + ring 边框 */
export const adminInput =
  "w-full rounded-xl bg-muted px-3 py-2 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring transition-all"

/** 搜索框 — 左侧留白给图标 */
export const adminSearchInput =
  "rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring transition-all w-full sm:w-48"

/** 按钮 — 主要操作 */
export const adminBtnPrimary =
  "flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"

/** 按钮 — 次要操作 */
export const adminBtnSecondary =
  "flex items-center gap-1.5 rounded-xl bg-secondary text-foreground px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:ring-primary/40 transition-all cursor-pointer disabled:opacity-50"

/** 按钮 — 危险操作 */
export const adminBtnDanger =
  "flex items-center gap-1.5 rounded-xl bg-red-500/10 text-red-400 px-3 py-1.5 text-xs font-medium ring-1 ring-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50"
