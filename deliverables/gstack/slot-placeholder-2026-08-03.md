# 首页常驻空槽位系统：闪动 + 比例修复复盘

**日期**：2026-08-03
**场景**：调试复盘（UI 修复 + 验证收口）
**参与成员**：设计师（gstack-designer） + 质量门神（gstack-qa-lead）

---

## 📌 TL;DR（执行摘要）

- 整体结论：🟢 通过（修复已闭环，复验无回归）
- 用户投诉「一直闪」根因 = 32 个骨架 shimmer 动画被复用于常驻槽位 + `AnnouncePlaceholder` 的 `dark:` 前缀导致 SSR 首屏浅灰闪；两者均已消除。
- 用户投诉「比例不对」根因 = box-model 偏差（标题 16px vs 真实 20.625px、缺 spacer、tagline 20px vs 真实 18/26px）；已按真实 `GameCard` 1:1 结构复刻。
- 阻塞项数量：0（修复全部落地并通过构建；仅有 1 项技术债/体验项转用户决策）。
- 下一步：用户侧部署应用改动 + 生产环境浏览器回归。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟢 Go（代码层 Production Ready，待部署回归） |
| 严重度分布（原始问题） | 🔴 2 / 🟠 1 / 🟡 1 / ⬜ 1（已修复 4，1 项转决策） |
| 关键行动项 | 4 条（见下） |
| 建议负责人 | 部署/回归 = 用户侧；品牌卡 ghosting = 用户拍板是否单开 |

---

## 1. 各成员核心结论

### 🎨 设计师（设计系统与视觉）
- 核心判断：原实现混淆了「加载骨架（动画、内容将到达）」与「常驻空槽（无动画、为未来内容预留）」两种**状态语义**；闪动来自骨架动画复用 + `dark:` 首屏陷阱，比例来自 box-model 偏差。给出像素级 spec：封面 3/4·4/5、标题 20.625px、tagline 18/26px、grid 用 `border` / list 用 `box-shadow`（两者对布局影响不同，不能共用值）。
- 关键建议：① 状态语义必须分层，常驻结构用「空槽」而非「骨架」；② 颜色用「dark base + `.light` 覆盖」，严禁 `dark:` 前缀（SSR 首屏无 `.dark` 类会先浅灰后翻转）；③ 比例必须 1:1 复刻真实 `GameCard` 结构，复用 `.game-card-spacer` 占位。

### ✅ 质量门神（QA 测试与发布）
- 核心判断：首轮 11 项像素级验证全 🟢 PASS；定向复验三项全 PASS 无回归 —— SSR HTML `from-zinc-200`/`dark:from-zinc-800` 残留 = 0、四场景零动画、12 槽等高 422px（移动 301px）、`.announce-cover-fallback` 规则进构建产物且双主题解析正确。
- 关键建议：#1（announce 兜底面 zinc 渐变闪动）已采纳修复并确认闭环；#2（浅色模式品牌卡文字重影）与本轮改动无关，维持「转站长单独验收」建议。

> 只列实际上场成员；主理人未代写任何专业产出。

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 状态 | 来源成员 |
|---|--------|------|------|---------|------|------|---------|
| 1 | 🔴 | 体验/动画 | `game-grid-client.tsx`、`(home)/page.tsx`、`(home)/loading.tsx` | 32 个 `skeleton-shimmer` 无限动画复用于常驻槽位 → 持续闪动 | 新建 `.game-slot` 家族（零动画），常驻态弃用骨架 | ✅ 已修复 | 设计师 + 质量门神 |
| 2 | 🔴 | 体验/首屏闪 | `(home)/page.tsx` `AnnouncePlaceholder` | `dark:` 前缀渐变 → SSR 首屏浅灰闪（`.dark` 由运行时 script 注入，SSR HTML 无该类） | 去 `dark:` 前缀，改用 dark base + `.light` 覆盖的 `.announce-slot` | ✅ 已修复 | 设计师 |
| 3 | 🟠 | 视觉/比例 | `game-card.tsx` `GameCardSlot`、`GameListRowSlot` | box-model 偏差：标题 16px vs 真实 20.625px、缺 spacer、tagline 20px vs 真实 18/26px、封面比例未对齐 | 1:1 复刻真实 `GameCard`（封面 3/4·4/5、标题 `.game-slot-title`、tagline、复用 `.game-card-spacer`）；grid `border` / list `box-shadow` | ✅ 已修复 | 设计师 + 质量门神 |
| 4 | 🟡 | 体验/首屏闪 | `announce-swiper.tsx:87` 封面兜底 | 同款 `dark:` + zinc 渐变兜底图闪动（side-finding #1） | 改 `.announce-cover-fallback` + `ImageIcon` 取 `slot-mark` 色板 | ✅ 已修复 | 质量门神 |
| 5 | ⬜ | 体验/浅色模式 | 品牌卡片（首页 `brand-card`） | 浅色模式文字重影/发虚（side-finding #2），与本轮改动无关，判定既有问题 | 转站长单独验收，是否单开任务待用户拍板 | ⏸ 转决策 | 质量门神 |

---

## ✅ 行动清单（具体可执行项）

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 部署应用本次 slot-placeholder 改动到生产（Coolify 手动 build + 推 GHCR + 新建 Docker Image 资源）；agent 不动 git/服务器 | 用户侧 | P1 | 部署窗口 |
| 2 | 生产环境浏览器回归：确认无闪动、12 槽等高、封面/标题/标签比例正确 | 用户侧 | P2 | 部署后 |
| 3 | 浅色模式品牌卡文字重影验收与修复（side-finding #2）—— 是否单开任务由用户拍板 | 用户拍板 | P3 | 待定 |
| 4 | 技术债：清理 `theme-script.tsx` 读 `headers()` 导致 132 页全 dynamic 的 10+ 冗余 revalidate 配置 | 工程 | P2 | 后续迭代 |

---

## ⚠️ 待完善 / 已知局限

- **浅色模式品牌卡文字重影（side-finding #2）**：本轮定向复验未专门重测，判定为既有问题、与 slot 改动无关；维持「转站长决策」建议。
- **生产回归未做**：验证仅在本机构建 + 本地服务 + Playwright 探测完成；真实 CDN/弱网下的首屏表现需部署后用户侧回归。
- **构建环境**：Next 16 Turbopack 进度写 TTY，PowerShell `Start-Transcript` 不捕获构建输出，以退出码 + `BUILD_ID` 判定成功（BUILD_ID=BuBb3iN8kavzX6t9mHwGv）。本机 bash 持续静默，全程经 PowerShell + 文件落盘完成，未写入项目目录。

---

## 📚 成员产出索引

- gstack-designer（设计师）原始产出：常驻空槽位像素级 spec v1（封面比例、标题/标签高度、grid border vs list box-shadow、dark-base + `.light` 覆盖规则、状态语义分层）。
- gstack-qa-lead（质量门神）原始产出：
  - 首轮 11 项验证报告（TEMP：`circleica-slot-audit/report.md`，全 🟢 PASS）。
  - 定向复验报告（TEMP：`circleica-slot-audit/report-reverify.md`，三项全 PASS 无回归；附 `reverify.json` / `home2.html` / `ssr-compare.txt` / `css-rule.txt` / `verify-out.txt` / 截图 `re-desktopDark/Light/mobileDark.png`）。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
