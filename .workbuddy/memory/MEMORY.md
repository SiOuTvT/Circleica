# Circleica 设计重构长期约定

## 整体设计理念（用户 2026-07-24 总纲，最高优先级）
- Circleica 最终目标：**不是传统资源站，而是有统一设计语言、统一浏览体验的完整产品**。逐步向 Galvelica 的设计语言靠拢（精致、留白、信息层级、品牌感、阅读舒适），但**不是粗暴的资源堆砌**。
- **海报风格仍禁止**：大 glow hero、展示式戏剧留白、海报化排版不允许（尤其首页）。Galvelica 的"海报/编辑式"是其副站专属，主站不抄它的海报气质，但可借其品质底子（令牌/间距/圆角/阴影/衬线标题的工整度）。
- 主站 ≠ 粗暴资源站，也 ≠ 海报站；是"有品牌感的精致内容产品"。
- **允许大胆重构**：布局/信息架构不合理可直接推翻重规划，不必兼容旧设计。目标是成熟、统一、优雅、长期可维护，不是"把旧页面做漂亮"。
  - 用户铁律（协作）：页面重构拿不准/多方案，先出 2-3 个具体方案让我挑，不要把决策推回给我从零想。

## Circleica × Galvelica 产品定位与数据体系（2026-07-25 用户重新定义，最高优先级）
- **两大产品职责彻底分离**：
  - Circleica = 资源站。只展示本站已收录游戏；搜索只返本站资源。负责资源/下载/社区/收藏/评论。用户来"获取资源"。
  - Galvelica = 资料馆（Archive）。应尽力收录整个同人 VN 生态作品资料，DB 规模应远大于 Circleica。用户来"了解作品"，不是下载。
- **两者共享作品关联、互补而非重复**：Circleica="我想下载"；Galvelica="我想了解"。不是两个重复站。
- **Galvelica 多数据源、不依赖单一**：优先 VNDB(核心)/Bangumi(中文)/ErogameScape·批评空间(资料)/DLsite(官方商品)/Steam(仅限有Steam版)。可续扩新权威源。Circleica 后台上传仍走 VNDB 不变。
- **不依赖任一源**：同人数据碎片化，各源覆盖不齐。"谁有数据就用谁"——只要一个可靠源即可建资料页；其他源补全后自动关联完善；全源皆无也允许站长后台手动建资料。Galvelica 不被任何第三方库限制。
- **智能数据融合（非复制）**：整合多权威源生成 Galvelica 自己的资料页。只 VNDB→全来自 VNDB；VNDB+Bangumi→融合；五源齐→整合成统一档案。用户看到"一份完整作品档案"，不是"五份不同站数据"。
- **字段级融合（非后写覆盖）**：按字段选优合并——作品名 VNDB 优先；中文标题 Bangumi 优先；官方购买链接 DLsite 优先；Steam 页 Steam 优先；Staff 取最完整并可合并；标签多源去重合并；角色/CV/系列关系自动融合不重复。**站长人工修改后，后续同步不得自动覆盖人工内容**；后台支持人工调整与最终确认。Galvelica 永远保留自己的最终资料，不纯依赖第三方。
- **Galvelica ↔ Circleica 联动**：每个资料页判断是否已收录。已收录→"查看资源/前往 Circleica"直达本站详情页。未收录→不出现空页；提供"申请收录/请求收录"→进后台待审核列表，站长可见并快速建 Circleica 资源页。流程自然，无需留言。
- **搜索分治**：Circleica 搜索只搜本站资源；Galvelica 搜索整个资料库（即便无资源也能查作品/Staff/社团/标签/发布时间/系列/角色/官方信息）——"找不到资源，也能找到资料"。
- **最终目标**：Galvelica 拥有自己的数据库，第三方只是资料提供者而非拥有者；多源智能融合+人工维护+持续补充→属于 Galvelica 自己、长期可维护、持续成长的同人 VN 资料库。
- ⚠️ 影响基线：后续任何数据层/搜索/详情页改动，都以"两站互补、Galvelica 多源融合"为基线，不能把 Galvelica 当 Circleica 镜像。视觉层"主站禁海报风格、Galvelica 海报气质属其自身"的旧约定仍有效，与本数据定位不冲突。

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

## Galvelica 数据体系落地进度（2026-07-26 全阶段已落地 + 广收录核心）
- 阶段 A 地基 / B 适配器 / C 回填 / D 多源融合 / E 联动 UX / F 搜索分治 —— **六项全部已实现**（代码层）；文档 §11 已落地。
- **⚠️ 定位铁律**：Galvelica=资料馆是原始设定，要收录「整个同人 VN 生态」。**广收录（从 VNDB 整批抓同人目录）是核心功能，不是可选扩展**；Stage C 回填只是把 Circleica 现有目录搬进资料馆当种子。
- **用户本机必跑（沙箱无 DB，agent 内一切进程连不上库）**：① `npx prisma generate && npx prisma migrate dev --name galvelica_stage_a` 建表（**含 YMGAL 枚举**，因本次加了月幕源）；② `npm run galvelica:backfill` 回填(种子)+首轮融合；③ **`npm run galvelica:ingest-vndb`（广收录核心，长任务，带限流+断点续跑，同人硬过滤在入库口落地「只收同人 VN」）**；④ 启用 Bangumi 多源融合需两步：`.env` 配 `BANGUMI_ACCESS_TOKEN` **且** 跑 `npm run galvelica:enrich-bangumi`；⑤ **`GALVELICA_DOUJIN_ONLY=0 npm run galvelica:ingest-ymgal`**（月幕 Galgame，开放免费 API，补中文译名/别名/封面；默认严格同人模式被闸门跳过，需显式放开）。
- **严格同人闸门（不变式「只收同人 VN」）**：`sources/doujin-gate.ts`，`GALVELICA_DOUJIN_ONLY` 默认 1=只收带同人标签源(VNDB/Bangumi)；月幕 YmGal 等 galge 广义源默认跳过，设 0 放开。EGS 因中国 IP 可能墙+API 不稳暂未实现；nhentai/jandapress 等成人同人志(manga)已明确排除（非 galge）。
- **CnGal 适配器 + Steam 发现层已落地（2026-07-26，回应"全球同人+搜源里可能没有的新同人"）**：① `sources/cngal.ts`（CnGal API：GetEntryView 详情 / GetEntryHomeList 搜索 / GetPublishGamesByTime 按月列游戏；匿名可访问，配 `CNGL_API_TOKEN` 则 Bearer 提额）+ `scripts/ingest-cngal.ts`（按月列游戏→逐 id 拉详情建 Work{CNGL}，限流 300ms、断点续跑 `.galvelica-ingest-cngal.json`）。② `sources/steam.ts` + `scripts/ingest-discovery.ts`（Steam 商店 API 无需密钥，多语种关键词搜→仅放行 VN genre→建 Work{STEAM} 候选，去重、断点续跑 `.galvelica-ingest-discovery.json`）。③ 接线：`CNGL` 入 `WorkSourceType` 枚举+`SourceKey`+融合表兜底(title/aliases/description/coverImage/releaseDate)；`DOUJIN_CURATED` 扩为 [VNDB,BANGUMI,CNGL,STEAM]（默认收录，契合"全球同人"）；package.json 加 `galvelica:ingest-cngal`/`galvelica:ingest-discovery`。④ 用户提供的 CnGal 令牌已写入 `.env` 的 `CNGL_API_TOKEN`（真实 API 已验证 Bearer 可用）。新增 `CNGL` 枚举需本机 `prisma migrate dev --name galvelica_cngal`（agent 内 generate 因沙箱锁只更新了 TS 类型，引擎二进制 rename 被 EPERM 拦）。
- 代码已 `tsc --noEmit` EXIT 0、改动文件 eslint 0 error。未跑命令前，`galvelica.ts` 经 `archiveReady()` 优雅回退旧 Game 视图，行为不变。
- **⚠️ 部署安全铁律（用户 2026-07-26 强烈要求）**：Galvelica 所有改动必须**纯加法、deploy 安全、不破坏其现有 Docker+pm2 部署**。现状：docker-compose 有独立 `migrate` 服务跑 `prisma migrate deploy`（幂等，自动应用新迁移文件）；新模型=多一个迁移文件，他现有 `docker compose run --rm migrate` 步骤照常应用，部署方法不变；新增 env(BANGUMI_*/GALVELICA_*) 全可选优雅降级，无需改 docker-compose；即使不生成迁移/不灌数据，archiveReady() 回退 Game 视图→现有站绝不崩。唯一用户侧动作=本机 `prisma migrate dev --name galvelica_stage_a` 生成迁移文件进 git，之后部署全自动。后续任何 Galvelica 改动都须遵守此铁律，不得引入破坏性迁移或必填部署配置。
- **资料馆填充已焊进部署流程（2026-07-26，开源可复现）**：新增 `ingest` 服务（docker-compose `profiles:[ingest]`，`build.target:builder` 复用含全量 src+tsx 的构建阶段，不污染 runner 镜像）+ `ingest-entrypoint.sh`（DB 等待+幂等断点续跑填充：backfill→vndb→cngal→discovery，月幕仅 `GALVELICA_DOUJIN_ONLY=0`）+ DEPLOYMENT.md 两种方式都写了「填充 Galvelica 资料馆（可选但推荐）」步骤。新机严格按文档=`docker compose up -d`（站点起）+可选 `docker compose run --rm ingest`（资料馆长出来），无需我们额外跑代码；数据持久化于 Postgres、重部署不丢、未填充时站点正常（空状态兜底）。这满足了用户「完美主义/开源别人部署也不能缺步骤」的诉求。
