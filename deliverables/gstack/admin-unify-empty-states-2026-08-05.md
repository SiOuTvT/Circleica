# 主站后台统一：空状态 / 按钮 / 标签布局 + 主副站数据隔离

**日期**：2026-08-05
**场景**：设计审查 + 数据逻辑修正 + 全流程交付（视觉统一 + 数据隔离）
**参与成员**：调查员×2（视觉审计 / 数据审计）、设计师、产品官、实现×2（视觉 / 数据）

---

## 📌 TL;DR
- 整体结论：🟢 代码改造完成，类型检查 0 错误，关键改动经主理人独立 grep 复核全部就位。
- 阻塞项：1（环境）——沙箱 safe-delete 守卫在 syscall 层拦截 Next.js 所有写操作（`next build` 的 unlink/rename/open 与 `next dev` 的 `next-env.d.ts` 写入均被 EPERM 阻断），**无法在沙箱内重建/启动预览**。需用户在自家终端跑 `npm run dev` 或构建部署查看。
- 下一步：用户执行 `cleanup-subsite-leak.sql` 清除副站泄漏数据（agent 不碰 DB）。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟢 代码 Go；🔴 预览受环境守卫阻塞 |
| 严重度分布 | 🔴 1（环境） / 🟠 0 / 🟡 1（副站写入复发留待重构） / 🟢 完成 |
| 关键行动项 | 5 条 |
| 建议负责人 | 用户（执行 SQL / 构建）、agent（副站重构阶段堵写入） |

---

## 1. 各成员核心结论

### 🔍 调查员·视觉审计（gstack-investigator）
- 后台 28 个页面目录中 23 处空状态至少 5 种写法（虚线卡片+图标 / 虚线无图标 / Card 无图标 / 纯文字 / 表格行），图标、字号、边框、内边距全不统一；论坛+审计切换按钮点击填充 primary 变色（"薄荷绿变碧绿"属实）。已有 `EmptyState`、`adminBtn*` 件但后台 0 复用。

### 🔍 调查员·数据审计（gstack-investigator-2）
- 创作者/标签是副站 `fuseWork` 经 `resolveCreatorByName`(:171)/`resolveTagByName`(:154) 直写主表泄漏；前台 `getCreators` 已隔离，后台 `admin/creators`、`admin/tags` 未隔离；头像框/成就不引用 Creator（清 Creator 无副作用）；给出安全清除 SQL。

### 🎨 设计师（gstack-designer）
- 以现有 `empty-state.tsx` 为全站唯一件：容器 `py-20` 居中无边框、图标 `h-10 w-10 text-muted-foreground/40` strokeWidth 1.5（强制必填）、标题 `text-sm font-medium`、描述 `text-sm text-muted-foreground max-w-sm`；切换按钮去填充改下划线（active `text-foreground border-b-2 border-primary` / inactive `border-transparent`）；标签改 `flex flex-wrap` 芯片流。

### 🛡️ 产品官（gstack-product-reviewer）
- 条件 Go。后台加 `isPublished` 过滤足够且误伤主站数据风险低；移除"未分组标签"；清除 SQL 需先备份+dry-run 并加预设组保护（防误删前台展示标签）；写入路径护栏（`work-service.ts`）本次按用户意愿留副站重构。

### 🔧 实现·视觉（gstack-implementer-a）
- 扩展 `empty-state.tsx` 为 canonical 件；替换后台 22 处手写空状态 + 补 games/music/announcements/users 4 页缺失分支（services/theme/site-settings 为纯设置表单跳过）；论坛/审计切换去填充改下划线；标签芯片流；前台三处同步 `message→title`。tsc/eslint 0 error。

### 🔧 实现·数据（gstack-implementer-b）
- `admin/creators`、`admin/tags`、`admin/tags/all` 加 `publishedGameFilter`（`games.some.game.isPublished`）；移除 `groupId:null` 查询与 `mappedUngrouped` 渲染（连带清 `overview-client.tsx` 死代码）；关系名 `games` 已核实。tsc/eslint 无新增错误。

---

## 2. 综合审查发现（去重合并）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源 |
|---|--------|------|------|---------|------|---------|
| 1 | 🔴 | 环境 | 沙箱 | safe-delete 守卫 syscall 层拦截 next build/dev 全部写操作，无法重建预览 | 用户侧构建/部署或申请沙箱豁免 | 主理人验证 |
| 2 | 🟡 | 架构 | work-service.ts:171/154 | 副站摄入仍直写主表，本次未堵 → 下次摄入复发 | 副站重构阶段拆独立表/Work 关系 | 产品官 |
| 3 | 🟢 | 视觉 | 23 处后台页 | 空状态 5 种写法、按钮/切换变色 | 已统一至 EmptyState + 下划线切换 | 设计/实现 |
| 4 | 🟢 | 数据 | admin/creators·tags·tags/all | 后台未隔离副站泄漏 | 已加 isPublished 过滤 | 实现 |
| 5 | 🟢 | 数据 | admin/tags | "未分组标签"分类（副站泄漏副产物） | 已移除 | 实现 |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 执行 `cleanup-subsite-leak.sql`（先备份+dry-run）清除副站泄漏 Creator/Tag | 用户 | P0 | 查看后 |
| 2 | 用户侧 `npm run dev` 或构建部署，核对后台空状态/按钮/标签统一效果 | 用户 | P0 | 查看后 |
| 3 | 提交并 push 本次 35 个源码改动（agent 不代提交） | 用户 | P1 | — |
| 4 | 副站重构阶段：堵 `work-service.ts` 写入主表，根治复发 | agent（后续） | P2 | 副站重构 |
| 5 | 核对头像框/成就模块逻辑，确认后台新建数据对应前台显示 | agent（收尾） | P2 | 后续 |

---

## ⚠️ 待完善 / 已知局限
- 沙箱守卫导致本次无法提供在线预览；代码正确性以 tsc 0 错误 + 主理人 grep 复核为准。
- 写入护栏未在本轮做（按用户"副站后台后续单独处理"），副站摄入仍会重新污染主表，靠后台 isPublished 过滤保证显示干净。
- `achievements/page.tsx` 两枚图标方钮保留原状（语义不符 pill helper，强行收敛反损交互）。

---

## 📚 成员产出索引
- gstack-investigator（视觉审计）原始产出：后台空状态/按钮清单表 A/B。
- gstack-investigator-2（数据审计）原始产出：创作者/标签写入事实链 + 清除 SQL。
- gstack-designer 原始产出：canonical 空状态/按钮/标签 className 规范。
- gstack-product-reviewer 原始产出：隔离/清除 SQL 安全复核 + 范围边界。
- gstack-implementer-a / -b 原始产出：上述改造文件清单与校验结果。

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
