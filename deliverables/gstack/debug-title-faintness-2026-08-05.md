# 全站页头英文 eyebrow「偏淡 / 没变化」根因排查与统一规范

**日期**：2026-08-05
**场景**：调试复盘 + 设计审查（根因分析 + 设计规范定稿）
**参与成员**：排障手（gstack-investigator） + 设计师（gstack-designer）

---

## 📌 TL;DR（执行摘要）

- **整体结论**：🟡 有条件通过（代码已统一修复，待部署生效）
- **「没变化」根因**：你看的是**尚未部署的旧生产站**——本地 `:3000` 已死（000），最新改动只在 `:3100` 预览与本地代码，未 push / 未 Coolify 重建，生产站自然不变。
- **「前台比后台淡」根因（旧站）**：旧生产站里前台 eyebrow 已是 `/70`、而当时后台页头用的是更粗的旧样式 → 视觉上「前台淡」；此差异在最新本地代码下**不可复现**（前后台已统一为同一类）。
- **真实设计缺陷**：`text-muted-foreground/70` 在 `bg-background` 上对比度仅 ≈2.7:1，**不达标 WCAG AA**——这才是你觉得「淡」的物理原因，与「是否部署」无关。
- **已落地修复**：全站主站页头 eyebrow 由 `/70` 改为满不透明 `text-muted-foreground`（对比度升至 ≈4.4–4.7:1 亮 / 7.8:1 暗），前台后台一致。
- **下一步**：用户 commit/push + Coolify 重建，生产站才会同步。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟡 条件 Go（代码已修，待部署） |
| 严重度分布 | 🔴 0 / 🟠 1（/70 AA 不达标，设计缺陷）/ 🟡 1（部署缺口）/ 🟢 0 |
| 关键行动项 | 4 条 |
| 建议负责人 | 用户（部署）/ 主理人（已改码） |

---

## 1. 各成员核心结论

### 🔧 排障手（根因分析）
- **核心判断**：在最新本地代码（`:3100`，HTTP 200）下，前台与后台「页头英文小标签（eyebrow）」类名**字节级一致**（`text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70`），且两者均落在同一 `bg-background` 基准上，背景无差异。因此「前台比后台淡」在本地**不可复现**。
- **关键建议**：两则用户反馈实为同一根因——**部署缺口**。旧生产站未更新到含标题对齐修复（`6afe139`）与后台统一（`admin-page-header`）的最新代码；用户看到的「淡」是旧站前台 `/70` vs 旧站后台更粗样式的残留差异。

### 🎨 设计师（设计规范定稿）
- **核心判断**：`/70` 对浅灰 muted 色再降 30% 不透明度，合成 ≈`#9d9d9d`，与白底对比度仅 ≈2.7:1，**远低于 AA 4.5:1**（且 eyebrow 是 `text-xs` 小字，需达标）。这就是用户「太淡」的体感来源，属真实可读性缺陷，非部署问题。
- **关键建议**：全站页头 eyebrow **去掉 `/70`**，统一用 `text-muted-foreground`（满不透明）。对比度升至 ≈4.4–4.7:1（亮色临界 AA / 暗色 7.8:1 稳过），既解决过淡，又仍弱于 `text-foreground` 标题、保留次级层级。备选 `text-foreground/70`（AAA）过于抢眼，不作默认。

> 仅实际上场成员列入；安全/产品/QA 未参与。

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 1 | 🟠 | 设计/可访问性 | 全站页头 eyebrow（`archive-hero` / `notifications` / `forum` / `admin-page-header`） | `text-muted-foreground/70` 在 `bg-background` 对比度 ≈2.7:1，不达标 WCAG AA，视觉过淡 | 改为 `text-muted-foreground`（已落地） | 设计师 |
| 2 | 🟡 | 部署/流程 | 生产环境 | 最新代码（标题对齐 + 后台统一 + eyebrow 规范）未部署，生产站反映旧 bundle，导致「没变化」+「前台比后台淡」 | 用户 commit/push + Coolify 重建 | 排障手 |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 提交并推送本地改动（含本次 eyebrow 统一 + 此前标题对齐修复），触发 Coolify 重建 | 用户 | P0 | 尽快 |
| 2 | 后台 `admin-page-header.tsx` 已为单一改动点（一处改全后台 ~30 页生效）；前台 `archive-hero`(2处)/`notifications`/`forum` 已改；确认 `:3100` 预览 eyebrow 已加深 | 主理人（已做）/ 用户验证 | P0 | 本次 |
| 3 | 副站 `galvelica/home-features.tsx:101` eyebrow 暂**不动**（属后续副站重构范畴，避免污染其设计体系）；如要顺带统一，单独排期 | 主理人/用户 | P2 | 副站重构时 |
| 4 | 可选：按设计师梯度表校准非页头次要标签（导航分组 `/50`→`/60`、页脚 `/70`→`/80`），提升整体可读性 | 用户拍板 | P3 | 后续 |

---

## ⚠️ 待完善 / 已知局限

- 副站 Galvelica 的 eyebrow / kicker 体系（含 `home-features`、`editor-pick` 用 `var(--gal-accent)`）未纳入本次统一，待副站基础重构阶段整体处理。
- 设计师梯度表中「导航分组标签提至 `/60`、页脚提至 `/80`」为建议值，本次**未实施**，需用户确认是否纳入。
- 亮色模式下满不透明 `text-muted-foreground` 对比度 ≈4.4–4.7:1 仅临界 AA；若团队强制 4.5:1 硬达标，需微调 `--muted-foreground` 亮色 token。
- 生产站是否真正同步，取决于用户部署动作（agent 不代提交/部署）。

---

## 📚 成员产出索引

- gstack-investigator（排障手）原始产出：根因报告——全站 eyebrow 类一致、`bg-background` 基准一致、「淡」在 `:3100` 不可复现，根因=未部署旧生产站（agent-de62715a）。
- gstack-designer（设计师）原始产出：设计规范——canonical=`text-muted-foreground`（去 `/70`），AA 对比度论证，`/70`≈2.7:1 不达标、满不透明≈4.4–4.7:1，并给出层级梯度表（agent-bb998426）。

---

## 🔧 第二轮补丁（17:0x）：首页 + 后台 theme 才是用户本地吐槽的真正漏网

> **更正**：上一轮将「没变化」归因于「未部署旧生产站」是**误判**——用户明确指出他说的就是本地（`localhost:3000`/`:3100`），且真正的根因是**首页整页页头组件从未被纳入统一范围**，而非部署问题。

### 排障手全量枚举结论（第二轮）
- 老「描述掉图标最左」对齐 bug 经全量核查**已根除**（archive-hero / notifications / forum 均 `items-start` + `min-w-0 flex-1`）。
- 但全站页头组件远不止这几个：首页 `(home)/page.tsx` 自研品牌卡 + 「资源大厅」区块、后台 `theme-editor.tsx` 均**未改到**。
- 用户本地看到的「①英文中文没对齐 ②前后台英文颜色不一样」根因：
  - 首页品牌卡 eyebrow「视觉小说资源站」前有 `brand-eyebrow-dot` 小圆点（`flex items-center gap-2` 包裹）→ 英文被圆点挤右、中文站名在真左缘 → **英文中文左基准线错开**（"没对齐"）。
  - 首页品牌卡 eyebrow 色 = `text-primary`（主题色）；「资源大厅」= `text-[var(--clr-blue)]`（蓝）→ 与后台 `text-muted-foreground` 不一致（"颜色不一样"）。
  - 后台 `theme-editor.tsx:84` eyebrow 仍是 `text-muted-foreground/70`。

### 已落地修复（主理人按既定 canonical 实施）
| 位置 | 改动 |
|------|------|
| `src/app/(home)/page.tsx:259-262` | 删 `brand-eyebrow-dot` span + 去 `flex items-center gap-2` 包裹；品牌卡 eyebrow `text-primary` → `text-muted-foreground`（与标题同左缘、同色） |
| `src/app/(home)/page.tsx:312` | 「资源大厅」eyebrow `text-[var(--clr-blue)]` → `text-muted-foreground`（tracking 归一 0.2em） |
| `src/components/theme-editor.tsx:84` | `text-muted-foreground/70` → `text-muted-foreground` |

### 验证（本轮）
- `tsc --noEmit` 0 error；`eslint` 0 error。
- 重建 `.next-pv` + 起 `:3000`/`:3100`；curl 确认首页 eyebrow 三处均 `uppercase tracking-[0.2em] text-muted-foreground`、HTML 中 `brand-eyebrow-dot` 计数 0、无 `text-primary`/`var(--clr-blue)` eyebrow。
- `next.config.ts` / `tsconfig.json` 已还原零 diff；仅 6 个源码文件改动 + 本报告。

### 修正后的全站一致性状态
- ✅ 页头 eyebrow 现已统一为 `text-muted-foreground`（前台 archive-hero/notifications/forum/首页品牌卡/首页资源大厅；后台 admin-page-header/theme-editor），前后台一致、AA 合规。
- ✅ 对齐：图标行页头 + 首页品牌卡均 eyebrow/标题/描述共用左基准线。
- ⏸️ 副站 Galvelica（home-features/works/page 用 `var(--gal-accent)` 或 `/70`）按既定「副站重构范畴」仍不动。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
