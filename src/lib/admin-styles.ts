/**
 * 后台共享样式 Token
 * 统一后台页面的输入框、按钮等样式，避免各页面各自定义导致碎片化。
 *
 * ⚠️ 调色板对齐全站 Archive Design System（与 ui/button 同源）：
 *  - 主按钮：bg-primary / text-primary-foreground / hover:bg-primary-strong
 *  - 次按钮：bg-secondary / text-secondary-foreground
 *  - 危险按钮：bg-destructive/10 / text-destructive / ring-destructive/20
 *  仅后台特有交互（输入框聚焦时圆角收为直角）保留 adminInput / adminSearchInput。
 */

/** 输入框 — 统一为 rounded-xl + bg-transparent + ring 边框（聚焦时圆角收直角为后台习惯） */
export const adminInput =
  "w-full rounded-xl border-2 border-input bg-transparent px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-[border-radius,border-color] duration-300 ease-out focus:rounded-none focus:border-primary"

/** 搜索框 — 左侧留白给图标 */
export const adminSearchInput =
  "rounded-xl border-2 border-input bg-transparent pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-[border-radius,border-color] duration-300 ease-out focus:rounded-none focus:border-primary transition-all w-full sm:w-56"

/** 按钮 — 主要操作（与 ui/button default 同源） */
export const adminBtnPrimary =
  "flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary-strong transition-all cursor-pointer disabled:opacity-50"

/** 按钮 — 次要操作（与 ui/button secondary 同源） */
export const adminBtnSecondary =
  "flex items-center gap-1.5 rounded-xl bg-secondary text-secondary-foreground px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:ring-primary/40 transition-all cursor-pointer disabled:opacity-50"

/** 按钮 — 危险操作（与 ui/button destructive 同源） */
export const adminBtnDanger =
  "flex items-center gap-1.5 rounded-xl bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-medium ring-1 ring-destructive/20 hover:bg-destructive/20 transition-all cursor-pointer disabled:opacity-50"
