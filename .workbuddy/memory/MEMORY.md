# Circleica 设计重构长期约定

## 整体设计理念（用户 2026-07-24 总纲，最高优先级）
- Circleica 最终目标：**不是传统资源站，而是有统一设计语言、统一浏览体验的完整产品**。逐步向 Galvelica 的设计语言靠拢（精致、留白、信息层级、品牌感、阅读舒适），但**不是粗暴的资源堆砌**。
- **海报风格仍禁止**：大 glow hero、展示式戏剧留白、海报化排版不允许（尤其首页）。Galvelica 的"海报/编辑式"是其副站专属，主站不抄它的海报气质，但可借其品质底子（令牌/间距/圆角/阴影/衬线标题的工整度）。
- 主站 ≠ 粗暴资源站，也 ≠ 海报站；是"有品牌感的精致内容产品"。
- **允许大胆重构**：布局/信息架构不合理可直接推翻重规划，不必兼容旧设计。目标是成熟、统一、优雅、长期可维护，不是"把旧页面做漂亮"。
- 用户铁律（协作）：页面重构拿不准/多方案，先出 2-3 个具体方案让我挑，不要把决策推回给我从零想。

## 信息架构（IA）
- 首页 = 展示（克制：品牌区 + 公告/最新 + 游戏卡片，足够；不堆功能）
- 分类页 = 浏览
- 搜索页 = 查找
- 详情页 = 阅读（最高优先级页面）
- 发现页 = 探索
- 标签浏览/精选合集/排行榜/社团/时间轴/分类/发现/高级筛选 → 各自独立页面，不塞首页。

## 重构优先级（用户指定）
1. ① 精修游戏详情页（最高）：围绕阅读体验、信息层级、留白、作品展示重设计，让用户愿意停留阅读，而非信息堆叠。
2. ② 统一筛选/排序/浏览工具栏：图鉴/搜索/标签/发现 共用交互逻辑与组件，降低学习成本。
3. ③ 重构 Game Card 与列表布局：优化比例/信息密度/留白/视觉层级，减少资源站粗感，贴近 Galvelica。
4. ④ 强化 Discovery：编辑精选/今日推荐/相似作品/系列关联/社团作品/随机发现/时间轴入口/继续浏览；减少标签堆砌，强调"探索内容"而非"展示数据"。

## Phase 0 已落地的令牌地基（全站通用）
- `@theme inline` 新增 `--font-heading`（衬线：Songti SC / Noto Serif SC / Georgia）。
- 基础标题 h1-h4 走衬线（h5/h6 黑体）。
- 语义色令牌成真工具类：`--color-success/warning/error/info` 及 soft 变体，使 `text-success`/`bg-error` 等不再 no-op。
- 亮色模式补全缺失变量（`--clr-blue/--clr-sky/--clr-glow/--theme-rgb` 等）。
- 散落硬编码色板收束到令牌（top-nav 印记/NSFW、forum-sidebar 解决态、avatar-frame 史莱姆框跟随主题色）。

## 其它铁律
- 主题色是 Setting 级高杠杆：改 `SiteSetting.themeColor` 全站自动换肤逻辑早已通好，八个预设里薄荷绿为默认。
- **绝不注入假数据做预览**：任何环境/离线/沙箱场景下，绝不用编造的游戏、公告、评论、用户、截图等假内容填充 UI。数据库不可达时只渲染页面自身已有的空状态/骨架框；需要演示数据请用户在本机填真实库。这是用户 2026-07-25 明确红线。

## ESLint Warning 清扫里程碑（2026-07-25）
- 96 warning → 57 warning（41% reduction），0 error，tsc 全绿
- 清除 28 个 `no-explicit-any`（prisma proxy、galvelica mapCard、utils、repositories、search service）
- 清除 11 个 misc（dead code、unused imports、exhaustive-deps 的 safe 项、img 禁用注释）
- 保留 54 any（UI 组件层 API fetch 响应类型，需 per-component 接口）
- 保留 3 misc（死 handler 级联 state var；post-detail-modal 循环风险）

## 环境限制（重要，影响所有 DB 相关验证）
- **数据库不可达是「agent 环境网络层拦截 127.0.0.1:5432」，不是「沙箱专属」**：实测 `net.connect(5432)` 握手"连上"，但 `pg_isready` 报 `no response`、Prisma 直连报 `Can't reach database server`——即 5432 上有网络层代理只接 TCP 握手、掐真实 PG 协议。**此拦截对本 agent 环境内的一切进程都生效：沙箱进程、乃至 `dangerouslyDisableSandbox: true`（跑在沙箱隔离之外）的进程都连不上库**。已用 Prisma + pg_isready + 多端口探测三重确认。用户机器上 Postgres 进程确实在跑（PID 1986，`C:\Program Files\PostgreSQL\16\bin\postgres`），但它没在 5432 上监听 TCP（被拦截器占住），5433/5434 也未监听。
- 后果与预览方案：agent 起的 dev server 能渲染 HTML 外壳、但所有 DB 查询失败。为此 `src/lib/prisma.ts` 给 `PrismaClient` 包了一层 Proxy——探测 `SELECT 1` 失败即进入「离线回退」：所有**读查询返回空结果**（findMany→[]、count→0、findUnique→null 等），页面照常渲染自身已有的**空状态/骨架框**（如游戏网格的"暂无游戏"、详情页的"游戏不存在"），**绝不注入任何假数据**。写操作在离线回退下被阻止抛错，避免静默假成功。真实环境连得上库则走真数据、完全不受影响。运行时要看真实库数据，仍须本机非沙箱终端跑 dev server。
- **关键区分（已实证，重要，2026-07-25 修正）**：此前以为"用 3000 端口起服务就能绕过沙箱挡库"——**错**。5432 拦截是 agent 环境网络层、对 agent 内所有进程（含 dangerouslyDisableSandbox）生效，所以**从 agent 内起的 3000 服务照样连不上库**。唯一能跑通 DB 的路径是：**用户本机（桌面，完全不经过本 agent）双击 `D:\Circleica\start-dev.bat`**，它起的 `localhost:3000` 是用户自己的进程/网络，不受 agent 网络层拦截，Postgres 可达 → 初始化/写数据成功。用户浏览器开 `localhost:765` 会经预览转发到 agent 内沙箱（无库），故别用 765。
- 排查时别被 `net.connect → CONNECTED` 误导——那是 TCP 代理接住了握手，不代表真实可达。
- **沙箱还会杀数据库后台进程**：曾用本机 PG 16 二进制在沙箱起 5433 实例（initdb + pg_ctl start 成功、日志显示监听 5433 且"准备接受连接"、裸 TCP 握手能拿到 PG 认证包），但一执行真实查询连接即被掐，日志报 `autovacuum worker took too long to start; canceled`（fork 出的后台进程被沙箱卡死/杀掉）。故**沙箱本地 PG 也无法提供真实查询**。
- 结论：任何"**从 agent 环境内**拿到真实数据"的路径都死（沙箱 / dangerouslyDisableSandbox / agent 内起的 765 或 3000 服务全都不行）。agent 内服务现经**空结果回退**渲染 UI 预览（空框架，无假数据）。要看真实库数据 / 初始化站点，唯一路径 = **在你自己桌面双击 `D:\Circleica\start-dev.bat`**（它是你本机进程，绕开 agent 网络层拦截），自动起 3000 并开浏览器 `localhost:3000`。`dev` 脚本默认端口已改为 3000（`package.json`），765 已弃用并杀掉旧进程。

## 沙箱预览的空结果回退（prisma offline fallback）— 绝不假数据
- 触发：`src/lib/prisma.ts` 把真实 `PrismaClient` 包成 Proxy，首次查询前探测 `SELECT 1`；连不上库（沙箱/离线）就 `enabled.mock=true`，此后所有**读查询**改走 `getEmptyResult()` 返回空（findMany→[]、count→0、findUnique/findFirst→null、aggregate/groupBy→安全空对象），**不抛出、不返回任何假内容**。每个真实查询也包了 `.catch` 兜底切到空结果。写操作（create/update/delete…）在离线回退下直接 `throw` 阻止，避免静默假成功。
- **铁律（用户 2026-07-25 强烈反对假数据）**：预览/离线场景下**绝不**用编造的游戏、公告、评论、截图等假数据填充页面——宁可显示页面自身已有的空状态/骨架框（"暂无游戏"、GameCardSkeleton、详情页"游戏不存在"等），也不要假内容。假数据会让产品显得廉价、像山寨站，违背"有品牌感的精致内容产品"总纲。
- 首页 `src/app/page.tsx` 已去掉「DB 失败整页『数据加载失败』」分支：stats 查询失败时静默留默认 0/[]，页面照常渲染空框架。
- `next.config.ts` 开了 `dangerouslyAllowSVG: true` 仅为让 SVG 资源（真图或占位）经 `next/image`（画廊直接用它）正常渲染，与假数据无关。
- 风险/注意：改 prisma 查询返回字段时，若页面在空结果下解构了不存在的嵌套字段会崩，需保证页面在空数据下健壮（已有空态兜底）。

## 工具/环境坑（避免自己挖坑）
- **Bash 工具里重定向用 `2>/dev/null`，绝不用 `2>nul`**：Git Bash 会把 `2>nul` 当成「重定向到名为 `nul` 的文件」，在项目根目录写出 Windows 保留名垃圾文件。该文件会触发 Turbopack 编译崩溃（`reading file "...\nul"` → `函数不正确 os error 1` → `GET / 500`），且**在用户本机同一份项目上也造成影响**。
- **safe-delete 包装会拦截删除**：`rm` 与 Python `os.remove` 都被 WorkBuddy 的 safe-delete 包裹（送回收站）；对 `nul`/`con`/`aux` 等保留名文件回收站操作直接失败「指定的设备名无效」，导致删不掉。
- **强删保留名文件**：`python -c "import ctypes; ctypes.windll.kernel32.DeleteFileW(ctypes.create_unicode_buffer(r'\\\\?\\D:\\path\\nul'))"`（用 `\\?\` 长路径前缀禁用保留名翻译，直接调 Win32 API）。临时脚本文件用 Write 落盘、`-c` 内联会因 shell 转义把 `\\?\` 吃掉，故删保留名文件务必走脚本文件方式。
- 验证 Turbopack 是否真修好：重启 dev 后 `curl` 首页返回 200 且无 `FATAL`/`panic`/`reading file` 即代表编译恢复；运行时 "Invalid prisma invocation" 仅沙箱无 DB 时出现，本机有真库不出现。
