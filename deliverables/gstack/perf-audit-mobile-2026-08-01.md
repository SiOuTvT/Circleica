# Circleica 移动端性能审计报告

**日期**：2026-08-01
**场景**：性能审计（移动端 #4：页面特别慢，刷新/切换都要等很长时间）
**参与成员**：调查员(gstack-investigator) + 质量门神(gstack-qa-lead) **均因 429 限流失败**，本报告由主理人直接审计（如实声明，未代写成员产出）

---

## 📌 TL;DR（执行摘要）
- 整体结论：🟡 有条件通过——找到 3 个高影响根因 + 1 个部署侧关键项，均无「架构错误」，属「可优化的成本堆积」
- 阻塞项数量：0（没有必须推倒重来的问题）
- 核心数据：全站客户端 JS 共 2.7MB（minified）；**Sentry SDK 单块 456K 在每页首屏急切加载，约占首屏 JS 40%**；Archive 列表每次访问全量拉 1000 条；每导航有多次无缓存 DB 往返
- 下一步：先做零风险的缓存类 + Sentry 条件加载（方案 A），再做 Archive 分页改造（方案 B），部署侧上 CDN（方案 C，用户侧）

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go | 🟡 条件 Go（代码可优化，无需重构） |
| 严重度分布 | 🔴 3 / 🟠 2 / 🟡 3 |
| 关键行动项 | 5 条（见行动清单） |
| 建议负责人 | 代码侧：主理人/开发；部署侧（CDN/资源）：用户 |

---

## 1. 实测数据（2026-08-01 本地生产构建，Next 16.2.7 webpack）

- **全站客户端 JS 总量：2.7MB（minified，gzip 后约 800K–1M）**，56 个 chunk
- **每页急切加载基线 ≈ 524K minified**：framework 188K + main 144K + polyfills 112K + webpack 8K + main-app 8K + layout 64K
- **Sentry SDK chunk `2038` = 456K**，由 `main-app`（每页必载入口）急切引用 → **首屏关键路径**
- 其他大块：TipTap/ProseMirror 168K + 96K（编辑器，懒加载专用路由）；196K 共享 vendor
- 首页路由额外 page chunk 仅 20K → 页面代码本身很轻，**首屏大头就是基线 + Sentry**
- 字体：系统字体栈（PingFang/微软雅黑/宋体），无 webfont 下载 ✅
- 图片：`next/image` + AVIF/WebP + lazy + quality 75 + 首 4 张 priority ✅
- proxy.ts：175 行无 DB 调用，每请求开销可忽略 ✅

## 2. 综合审查发现（按严重度）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 |
|---|--------|------|------|---------|------|
| 1 | 🔴 | 包体 | `sentry.client.config.ts` + `next.config.ts` withSentry | **Sentry SDK 456K 在每页急切加载**（main-app 入口引用 chunk 2038），占首屏 JS ~40%；即使 DSN 未配置/生产禁用，SDK 代码仍传输+解析 | DSN 未配时完全跳过 Sentry bundle（条件 import/动态加载）；或拆出独立 chunk 仅按需加载 |
| 2 | 🔴 | 数据量 | `src/components/archive/*-archive-client.tsx` + `/api/credits/*` | **Archive 四套列表每次访问全量拉取 pageSize=1000**：hydration 后一次 fetch 1000 条 JSON + 渲染 1000 卡，移动端网络+渲染双重压力 | 服务端渲染分页（24/页+分页器）或客户端虚拟化/增量加载（IntersectionObserver），或至少降 pageSize + 分页 |
| 3 | 🔴 | 缓存 | 根布局 `getSiteSettingFresh("themeColor")` + 首页 `GameGridServer` + `games/[id]` 详情 | **每导航多次无缓存 DB 往返**：themeColor 每请求直查库（绕过全部缓存）；首页网格每请求 4 查询（findMany+count+tagGroup+placeholder，revalidate=60 对带 searchParams 的动态页不生效）；详情页每次访问查库 | themeColor 改 unstable_cache(TTL60)+写库 revalidateTag；首页网格查询走 Redis 短 TTL（复用现有 single-flight 模式）；详情页 Redis 短 TTL（viewCount 更新时失效） |
| 4 | 🟠 | 部署 | 部署拓扑 | **无 CDN**：静态资源与图片全打源站，next/image 优化器在源站 CPU 上跑，/uploads 无长缓存头；移动端跨网络 RTT 大 | 用户侧：Cloudflare CDN + 静态/图片缓存头；图片域挂 CDN |
| 5 | 🟠 | 包体 | 基线 | 基线 JS ~524K minified（Next+React19+next-auth+lucide 常态，偏重但非异常） | 空间有限；可查 lucide 按需引入是否彻底 tree-shake（低优先） |
| 6 | 🟡 | 架构 | `layout-wrapper.tsx` | 全站外壳是 client 组件，每页 hydration 4 个 ssr:false 动态组件（NavSidebar/ForumSidebar/MusicPlayer/EmailBanner）；已是 code-split，移动端仍需下载执行 | 可接受；如需极致可移动端视口隐藏侧边栏时减少加载 |
| 7 | 🟡 | 环境 | 沙箱构建 | 本地构建尾步（.next/export 清理）被沙箱 safe-delete 守卫拦截 → 本地 build 报错（编译/TS/静态生成均已成功）；生产 Docker 构建不受影响 | 环境限制，非项目问题 |
| 8 | 🟡 | 治理 | 全局 | `reactStrictMode: true` + Sentry 采样/集成已合理（replay 未开） | 维持现状 |

## ✅ 行动清单（按 ROI 排序）

| # | 行动 | 负责方 | 紧急度 | 风险 |
|---|------|--------|--------|------|
| 1 | **Sentry 条件加载**：`NEXT_PUBLIC_SENTRY_DSN` 未配置时跳过 SDK bundle（省 456K/首屏，预计移动端首屏 JS 减 ~40%） | 代码侧 | P0 | 低（零风险，DSN 配了行为不变） |
| 2 | **首页网格查询走 Redis 短缓存**（复用 home-stats 模式，TTL 60s + single-flight）+ **themeColor 缓存化**（TTL60 + 写库 revalidateTag） | 代码侧 | P0 | 低 |
| 3 | **Archive 列表改造**：服务端渲染分页（24/页 + 分页器/AZIndex 锚点保留）替换 pageSize=1000 全量拉取 | 代码侧 | P1 | 中（交互方案需选：分页 vs 虚拟化 vs 增量加载） |
| 4 | **详情页 Redis 短 TTL**（如 120s，viewCount/fav 写操作失效） | 代码侧 | P1 | 低-中（需处理计数一致性） |
| 5 | **部署侧上 CDN + 缓存头**（静态资源、/uploads、图片优化结果；Brotli） | 用户侧 | P1 | 部署操作归用户 |

## ⚠️ 待完善 / 已知局限
- **团队子代理失败**：gstack-investigator、gstack-qa-lead 均因模型 429 限流（重置 2026-08-01 21:57 UTC+8）无产出；本报告为主理人直接审计，未经二专家复核
- 无法访问线上部署 → 没有真实 Lighthouse/首屏实测；本地构建数据为权威替代。上线后建议补一轮移动端 4G 节流实测
- 图片传输量依赖实际封面文件大小与 CDN 有无，需用户侧确认存储后端（R2 vs 本地）后再定图片优化策略
- `.next_bak_perf`（旧构建残留 ~1.3G）在项目根目录，已被 gitignore，但沙箱 safe-delete 守卫拦批量删除，需用户手动清理或允许分批删

> 本报告由软件工坊 AI 协作生成（主理人直接执行），关键决策请由工程负责人复核。
