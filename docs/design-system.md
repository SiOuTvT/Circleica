# Design System 规范

> 最终版 — 后续按此规范开发，不再调整整体规则。

---

## 1. 分层原则

所有 UI 归属四层：**Layout / Component / Token / State**

- **Layout**: 页面结构（LayoutWrapper、页面容器）
- **Component**: 可复用组件（Card、Tag、Button 等）
- **Token**: 设计变量（spacing、color、radius、motion、type）
- **State**: 交互状态（hover、active、disabled、focus）

不允许跨层修改样式。页面不直接写设计属性，优先使用组件组合。

---

## 2. Spacing Token Scale

### Layout / Section / Card 级间距 — 严格 token

| Token | px  | Tailwind |
|-------|-----|----------|
| sp-1  | 4   | p-1 / gap-1 |
| sp-2  | 8   | p-2 / gap-2 |
| sp-3  | 12  | p-3 / gap-3 |
| sp-4  | 16  | p-4 / gap-4 |
| sp-5  | 20  | p-5 / gap-5 |
| sp-6  | 24  | p-6 / gap-6 |
| sp-8  | 32  | p-8 / gap-8 |

### 组件内部微间距 — 允许 6px

`gap-1.5` / `px-1.5` 仅用于：
- Icon + Text 间距
- Button 内部 padding/gap
- Badge / 小标签内部
- 紧凑型 UI 元素

### 禁止

- `style={{ padding/margin/gap/borderRadius/color: ... }}` 设计属性 inline style
- Layout/Section/Card 级 fractional spacing
- spacing 场景的任意 `[Npx]` 值

### 允许的 style={{ ... }}

- transform / translate
- CSS Variables 引用
- 第三方库必须使用 inline style 的场景

---

## 3. Section 间距 — 三档

| 档位 | Mobile | Desktop | 场景 |
|------|--------|---------|------|
| S    | gap-4 (16px) | sm:gap-5 | 后台、论坛列表、设置 |
| M    | gap-5 (20px) | sm:gap-7 | 游戏详情、资源、搜索 |
| L    | gap-6 (24px) | sm:gap-8 | 首页、品牌展示、落地页 |

---

## 4. Card Padding — 四级

| 档位       | Mobile | Desktop | 场景 |
|------------|--------|---------|------|
| Compact    | p-3 (12px) | sm:p-4 | 评论卡、通知项、列表行 |
| Default    | p-4 (16px) | sm:p-5 | 游戏卡片、论坛帖子 |
| Comfortable| p-5 (20px) | —      | 大部分详情页、中等内容 |
| Large      | p-6 (24px) | —      | 弹窗、详情面板、表单 |

---

## 5. Tag 圆角

| 类型 | 圆角 | 说明 |
|------|------|------|
| 内容标签 (Tag) | `rounded-md`（默认） | 游戏/资源/角色标签 |
| 强调标签 | `rounded-xl`（可选） | 需要柔和视觉时 |
| Badge (NEW/HOT/18+) | `rounded-full` | 状态徽章、通知数字 |
| 后台状态标签 | `rounded-md` | 管理后台状态标记 |

---

## 6. Density — 按 Section 划分

同一页面不同区块可有不同密度：

| 密度       | Section | Card        |
|------------|---------|-------------|
| Compact    | S       | Compact     |
| Default    | M       | Default     |
| Comfortable| L       | Comfortable |

示例 — 游戏详情页：
- 封面信息区 → Comfortable (Section L + Card Comfortable)
- 游戏介绍区 → Default (Section M + Card Default)
- 评论区 → Compact (Section S + Card Compact)

---

## 7. Typography 排版

### 字体

| 用途 | 字体 |
|------|------|
| 标题 | Noto Serif SC (--font-serif) |
| 正文 | Noto Sans SC (--font-sans) |
| 代码 | JetBrains Mono (--font-mono) |

### 字号规范 — 禁止 text-[13px] / text-[15px] / text-[17px] 等零散字号

| 级别 | 字号 | 字重 | 行高 | Tailwind |
|------|------|------|------|----------|
| Display | 32px | 700 | 1.2 | text-3xl |
| H1 | 24px | 700 | 1.3 | text-2xl |
| H2 | 20px | 600 | 1.4 | text-xl |
| H3 | 16px | 600 | 1.5 | text-base |
| Body | 15~16px (responsive) | 400 | 1.7 | text-sm / text-base |
| Small | 14px | 400 | 1.5 | text-sm |
| Caption | 12px | 400 | 1.4 | text-xs |

---

## 8. Icon Size — 仅允许以下尺寸

| Tailwind | px  | 场景 |
|----------|-----|------|
| size-3   | 12  | inline badge icon |
| size-4   | 16  | 文本内 icon、按钮 icon |
| size-5   | 20  | 导航 icon、中等 icon |
| size-6   | 24  | 大 icon、feature icon |
| size-8   | 32  | hero icon、空状态 icon |
| size-10  | 40  | 大空状态 icon |
| size-12  | 48  | Hero / 404 大 icon |

禁止 17/19/23 等零散尺寸。

---

## 9. Radius 圆角 — 三档

| 级别 | 值 | Tailwind | 场景 |
|------|-----|----------|------|
| Container | 16px | rounded-2xl | 卡片、面板、弹窗 |
| Interactive | 12px | rounded-xl | 按钮、输入框、标签 |
| Pill | 9999px | rounded-full | 胶囊、头像、徽章 |

补充：
- 后台状态标签、小元素：`rounded-md` (7.5px)
- 不同类型承担不同作用，不强制统一

---

## 10. 颜色规范

### 业务组件禁止硬编码颜色

```
✓ text-primary / text-foreground / text-muted-foreground
✓ bg-primary / bg-card / bg-muted / bg-background
✓ bg-primary/10 / bg-primary/15 / bg-primary/20
✓ border-border / border-input / ring-ring
```

### 允许固定颜色

- Logo、品牌插画
- SVG 图形
- 特殊渐变
- 第三方组件必须的颜色

---

## 11. Motion 动画

### 统一时长

| 场景 | 时长 | Token |
|------|------|-------|
| Hover | 150~200ms | --duration-fast / --duration-normal |
| Collapse / Expand | 250~300ms | --duration-slow |
| Modal | 200ms | --duration-normal |
| Toast | 250ms | --duration-normal |

### Easing

使用 globals.css 中已有 token：
- `--ease-default` — 通用
- `--ease-spring` — 弹性效果

禁止各组件自行写 `transition: all 0.3s` 等非 token 时长。

---

## 12. Mobile-First 规则

手机端不是桌面缩放版：

| 属性 | 移动端 | 桌面端 |
|------|--------|--------|
| Section gap | 20px (gap-5) | 按三档 |
| Card padding | 16px (p-4) | 按四级 |
| Tag height | 18~20px | 同 |
| Body line-height | 1.4 | 1.7 |
| Touch target | 44px min | — |

---

## 13. Component First 原则

不新建 PageContainer / Section / PageHeader 等包裹组件。扩展现有：
- `LayoutWrapper` — 页面外壳
- `Card` — Compact / Default / Comfortable / Large
- `TagGroup` — 标签组容器
- `Tag` / `Badge` — 标签 / 徽章

页面直接用 Tailwind class + 现有组件组合。
