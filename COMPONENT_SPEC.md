# Component Spec — 设计规范

> 全站组件视觉一致性参考。所有新组件和修改必须遵循本规范。

---

## 1. 圆角系统（3 档）

| 档位 | Tailwind | 像素 | 用途 |
|------|----------|------|------|
| 容器 | `rounded-2xl` | 16px | 卡片、面板、弹窗、侧边栏面板 |
| 交互 | `rounded-xl` | 12px | 按钮、输入框、下拉菜单 |
| 胶囊 | `rounded-full` | 9999px | 标签、徽章、头像、分页点 |

**禁止** 使用 `rounded-md`、`rounded-lg`、`rounded-4xl` 等非标值。

---

## 2. 标签 / Badge 尺寸（统一 2 档）

| 档位 | 样式 | 用途 |
|------|------|------|
| 标准 | `rounded-full px-2.5 py-1 text-xs font-semibold` | 游戏标签、分类标签、状态标签 |
| 紧凑 | `rounded-full px-2 py-0.5 text-[10px] font-medium` | 统计行内标签、计数 badge |

颜色方案：`background: ${color}20`，`color: ${color}`（淡色背景 + 原色文字）。
禁止使用实色背景 + 白字。

---

## 3. 边框

统一使用 Tailwind `ring-1 ring-border`。
禁止使用内联 `border: 1px solid rgba(...)` 或 CSS 文件中的硬编码边框。

---

## 4. 阴影

统一使用 CSS 变量令牌：

| 状态 | 令牌 |
|------|------|
| 默认 | `var(--card-shadow)` |
| Hover | `var(--card-shadow-hover)` |

禁止内联 `boxShadow: "0 2px 12px rgba(0,0,0,0.06)"` 等硬编码值。
需要阴影但无 hover 变化的静态元素用 `.card-shadow` 工具类。

---

## 5. Hover 效果（统一方案）

| 元素类型 | Hover 效果 |
|----------|-----------|
| 可点击卡片（游戏卡片、论坛帖子卡片） | `translateY(-2px)` + `var(--card-shadow-hover)` + `ring-primary/30` |
| 按钮 | `translate-y-px`（active 时下压） |
| 链接 | `color` 变化，无位移 |
| 静态面板 | 无 hover 效果 |

禁止全局 `[class*="..."]` 选择器控制 hover。

---

## 6. 图标尺寸

| 场景 | 尺寸 | Tailwind |
|------|------|----------|
| 统计行图标 | 16px | `w-4 h-4` |
| 按钮内图标 | 16px | `w-4 h-4`（跟随 Button 组件） |
| 导航栏图标（手机） | 20px | `h-5 w-5` |
| 导航栏图标（桌面） | 24px | `h-6 w-6` |
| 大装饰图标 | 24px | `h-6 w-6` |

---

## 7. 卡片 padding（响应式）

| 设备 | padding |
|------|---------|
| 手机 | `p-4`（16px） |
| 平板 | `p-5`（20px） |
| 桌面 | `p-5` 或 `p-6`（20-24px） |

游戏卡片已有独立响应式规则（`px-2.5 pt-2 pb-2.5 sm:px-4 sm:pt-3 sm:pb-4`），保持不变。

---

## 8. 字体

| 场景 | 手机 | 桌面 |
|------|------|------|
| 页面标题 | `text-lg` (18px) | `text-xl` (20px) |
| 卡片标题 | `text-base` (16px) | `text-base` (16px) |
| 正文 | `text-sm` (14px) | `text-sm` (14px) |
| 元数据/标签 | `text-xs` (12px) | `text-xs` (12px) |
| 辅助文字 | `text-[10px]` | `text-[10px]` |

---

## 9. 交互反馈

| 状态 | 效果 |
|------|------|
| `active` | `translate-y-px`（下压 1px），全局由 shadcn Button 管理 |
| `focus-visible` | `ring-2 ring-primary ring-offset-2 ring-offset-background` |
| `disabled` | `opacity-50 pointer-events-none` |

禁止使用 `scale(0.98)` 或 `scale(0.99)` 作为 active 反馈。

---

## 10. 颜色

组件中必须使用 CSS 变量，禁止 Tailwind 原始色板：

| 禁止 | 替代 |
|------|------|
| `bg-zinc-900` | `bg-card` |
| `text-zinc-200` | `text-foreground` |
| `text-zinc-400` | `text-muted-foreground` |
| `ring-white/10` | `ring-border` |
| `border-white/10` | `border-border` |

论坛分类等语义色（blue/amber/emerald/purple）允许使用，但仅限状态标签。

---

## 11. 按钮尺寸

| size | min-height | 用途 |
|------|-----------|------|
| `xs` | 36px | 紧凑操作 |
| `sm` | 40px | 次要操作 |
| `default` | 44px | 主要操作 |
| `lg` | 48px | CTA |
| `icon` | 44×44px | 图标按钮 |

---

## 12. 响应式断点

| 断点 | 宽度 | 设备 |
|------|------|------|
| 默认 | <640px | 手机 |
| `sm` | ≥640px | 大手机/小平板 |
| `md` | ≥768px | 平板 |
| `lg` | ≥1024px | 小桌面 |
| `xl` | ≥1280px | 大桌面 |

---

*最后更新：2026-06-25*
