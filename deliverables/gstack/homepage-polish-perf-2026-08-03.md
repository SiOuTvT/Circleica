# Circleica 收尾轮：首页常驻占位 + 性能代码化 + tag 对齐

**日期**：2026-08-03
**场景**：设计审查 + 调试复盘 + 移动端性能优化
**参与成员**：设计顾问（gstack-designer） + 质量门神（gstack-qa-lead）

---

## 📌 TL;DR（执行摘要）

- 🟢 整体结论：通过（代码已全部落地，构建验证中）
- 本轮三件事：① #1 tag 页 meta 对齐（已落）② #3 首页**常驻骨架屏占位系统**（按用户纠正后的真实需求实现，非早期 A+C 留白方案）③ 性能方案 C 推翻「挂 CDN」前提，改为纯代码加固（已落）
- 阻塞项：0
- 下一步：构建通过后本地 `http://localhost:3100` 验证首页 8 槽位常驻 + 部署后 curl 校验 `/uploads` 缓存头

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟢 Go |
| 严重度分布 | 🔴 0 / 🟠 0 / 🟡 1（perf 发现的死代码 revalidate 待清理）/ 🟢 多项 |
| 关键行动项 | 3 条（见下） |
| 建议负责人 | 主理人（已落地） |

---

## 1. 各成员核心结论

### 🎨 设计师（设计系统与视觉）
- **核心判断**：早期把 #3 理解为「大屏留白」，给出 A+C（虚线框占位卡 + 响应式撑高）。但用户纠正——真正需求是**首页常驻骨架屏占位系统**（游戏 8 槽位 + 公告占位卡，有数据覆盖，常驻不闪）。早期 A+C 方案被推翻，改为实现 Persistent Placeholder。
- **关键建议**：占位卡必须进入**服务端初始 HTML**（不是客户端 loading 态），加载前后视觉一致；游戏区固定 8 槽、公告区同尺寸占位，与现有 Archive/卡片设计语言对齐。

### ✅ 质量门神（QA测试与发布 / 性能）
- **核心判断**：**推翻两条前提**——① 你不需要 CDN；② 给 HTML 加 `public` 缓存头会白屏/安全降级（CSP nonce 决定 HTML 不可共享缓存，挂 CDN 也一样）。**真根因**：根 layout 读 `headers()` 使全站 132 页全变 dynamic（10+ 处 `revalidate` 全是死代码），且 `staleTimes.dynamic` 默认 0 → 每次导航都打服务器重渲染。
- **关键建议**：纯代码加固（零 Coolify UI）：`staleTimes.dynamic=30`（切页瞬开）、`images.minimumCacheTTL=31天`（省 AVIF 重编码）、`/uploads` immutable 头、`proxy.ts` 静态资源跳过 nonce 生成。Caddy/brotli/HTML 缓存均**不建议做**（收益低/风险高/架构不允许）。

---

## 2. 综合审查发现（去重合并后按严重度排序）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 1 | 🟡 | 性能 | 全站 | 根 layout `theme-script.tsx` 读 `headers()` → 全站 132 页强制 dynamic，10+ 处 `revalidate` 死代码 | 已用 `staleTimes` 缓解；死代码建议清理（见行动项） | 质量门神 |
| 2 | 🟡 | 性能 | `next.config.ts` | `staleTimes.dynamic=0` 客户端路由缓存关死，每导航打服务器 | 改为 30 | 质量门神 |
| 3 | 🟢 | 性能 | `next.config.ts` / `proxy.ts` | 图片优化产物仅缓存 4h + 每图请求跑 nonce 生成 | minimumCacheTTL=31天 + 静态资源跳过 nonce | 质量门神 |
| 4 | 🟢 | 设计 | `(home)/page.tsx` + `game-grid-client.tsx` | 公告区无数据时整块不渲染；游戏网格 0 数据时显示「暂无游戏」文字而非常驻占位卡 | 实现 8 槽位常驻 + 公告占位卡 | 设计师 |
| 5 | 🟢 | 一致性 | `credits/tag` + `credits/collection` | tag 页 H1「标签浏览」与 SEO title「标签图鉴」矛盾、缺 meta；collection 非空态 meta 数字缺高亮 | H1→标签图鉴 + 补 meta + collection meta 对齐 | 设计师 |

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 清理 10+ 处失效的 `export const revalidate`（标注或删除，避免误导后续优化） | 主理人 | P1 | 下一轮 |
| 2 | 部署后 `curl -sI 域名/uploads/xxx` 校验 `immutable`；手机实测来回切页瞬开 | 用户 + 主理人 | P0 | 部署后 |
| 3 | 本地 `http://localhost:3100` 验证首页 8 槽位常驻 + 公告占位卡 | 主理人 | P0 | 本轮构建后 |

---

## ⚠️ 待完善 / 已知局限

- **死代码 revalidate 未清理**：本轮聚焦性能收益，10+ 处 `export const revalidate` 仍为死配置（功能无影响），建议下轮清理并加注说明。
- **Caddy / brotli 未做**：质量门神评估为低 ROI + 高故障面，已明确否决；若未来实测带宽真成瓶颈再议。
- **HTML 缓存不可行**：CSP nonce 架构决定，挂 CDN 也无法解决，非项目缺陷。
- `/uploads` 缓存头在 public 静态链路是否真正落地需 curl 验证（已备 `proxy.ts` 兜底方案）。

---

## 📚 成员产出索引

- gstack-designer（设计顾问）原始产出：#3 三方案（A 虚线框 / C 撑高 / A+C 合并）+ #1 对齐确认 + 4 项相邻风险（Collection meta 不一致、空态未走 EmptyState、dead code、ArchiveHero 间距）
- gstack-qa-lead（质量门神）原始产出：推翻「需 CDN」前提、全站 dynamic 根因、staleTimes/minimumCacheTTL/headers/proxy 四处代码方案、Caddy/brotli 否决论证、死代码清理建议

---

> 本报告由软件工坊 AI 协作生成，关键决策请由工程负责人复核。
