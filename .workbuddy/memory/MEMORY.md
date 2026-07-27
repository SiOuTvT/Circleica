# Circleica 项目长期约定

## 设计总纲（2026-07-24，最高优先级）
- 目标：统一设计语言/浏览体验的完整产品，向 Galvelica 品质靠拢（精致/留白/层级/品牌感），非资源堆砌。
- 禁海报风（大 glow hero/戏剧留白/海报化排版，尤其首页）。主站≠资源站≠海报站=有品牌感的精致内容产品。
- 允许大胆重构，不必兼容旧设计。拿不准先出 2-3 具体方案让用户挑（用户铁律）。

## 产品定位（2026-07-25，最高优先级）
- Circleica=资源站（只展本站资源，搜只返本站）；Galvelica=资料馆（收录整个同人 VN 生态，搜全资料库）。互补不重复。
- 多源智能融合（VNDB核心/Bangumi/EGS/DLsite/Steam/CnGal/月幕）+字段级融合+人工修改不被覆盖。
- 搜索分治：Circleica 搜资源；Galvelica 搜资料。

## 信息架构 & 重构优先级
- IA：首页=展示(克制)；分类=浏览；搜索=查找；详情=阅读(最高)；发现=探索。
- 优先级：①详情页 ②统一工具栏 ③Game Card/列表 ④Discovery。

## 铁律
- 绝不注入假数据：DB 不可达时只渲染空状态/骨架框，不编造内容（用户红线）。
- 主题色 Setting 级高杠杆，薄荷绿默认。
- **Galvelica 部署安全铁律（2026-07-26）**：所有改动纯加法、deploy 安全、不破坏现有 Docker+pm2。新增 env 全可选优雅降级；新模型=多一个迁移文件，`prisma migrate deploy` 自动应用。

## 部署策略（2026-07-27 起，最高优先级）
- **战略转向：本地迭代 → 服务器部署**。原因：本地电脑内存受限，跑网站导致高内存占用、桌面崩溃；今后不再「修一点看一点」，所有改动走服务器部署。改前必须多查几遍、力求一次性解决，避免「部署完还是没修好」返工——这是用户明确下达的硬要求。
- **协作边界（2026-07-27 用户定稿）**：分工清晰——**用户**负责部署/测试/Git 提交/服务器与 Coolify/Cloudflare 等基础设施；**agent 负责写代码与修网站**（src/组件/页面/功能性配置改动都是 agent 的活，用户明确授权「帮我修网站写网站」）。agent **绝不做**：git commit/push、部署、动服务器侧、改 Docker/infra 配置（除非用户明确要求）。agent 改完代码说明改了什么，用户去部署测试；出问题用户贴报错，agent 再修。共享项目注意：结构性/大改动先简短知会，常规修 bug/写功能直接做。
- **平台 = Coolify**（用户已选定且**已实际部署过**，当前是 push→重建→贴报错修 的循环，非首次部署），**服务器在中国大陆**（可能有网络/合规限制）；测试服务器便宜、配置低（内存/算力紧）。地址用 Coolify 给的域名，因国内需备案经 **Cloudflare 之类中转**（代理在应用之前）。
- **对 agent 的硬要求**：部署类任务必须做部署前预检（只读通读 Dockerfile/compose/entrypoint/.env.example/next.config/health 路由），把「国内网络 + Docker Hub 拉取 + Cloudflare 代理协议」风险提前暴露；宁可在预检多花时间，不在部署后返工。用户会直接把部署报错贴给 agent 修。**用户已明确不需主动预检（等报错即可）；写代码是 agent 本职，但 git/部署/服务器一律不动。**
- **仓库对国内部署已较友好**：Dockerfile 已切国内 npm(`registry.npmmirror.com`)/apt(`mirrors.aliyun.com`) 镜像；`next.config.ts` 已 `output:"standalone"`；`/api/health` 路由存在→健康检查可过；`docker-entrypoint.sh` 启动即 `prisma migrate deploy`（幂等）→无需单独 migrate 步骤。
- **阻断级风险（预检 + 用户补充确认）**：① 基础镜像 `node:20-bookworm-slim`/`postgres:16-alpine` 来自 Docker Hub，国内拉取可能慢/失败→用户实测靠重试终能成功（非硬阻断），仍建议配镜像加速器提升一次成功率；② `NEXTAUTH_SECRET` 未显式设在容器内不挂卷(`/app/.secret`)→容器重建重新生成→全员掉登录，**必须显式设**（agent 已生成强密钥供贴入 Coolify env）；③ **`NEXTAUTH_URL` 必须显式设为 Coolify 域名(https)**：本地 `.env` 该值为空→默认 `http://localhost:3000`，部署后 NextAuth 回调写成 localhost→真实域名下登录/会话失效，属很可能已存在的隐性 bug，下次重建前必补；④ **Cloudflare/中转代理在应用之前**：须确保代理正确覆写 `X-Forwarded-Proto/For`，否则 Next.js 16（已移除 server.trustProxy、默认读上游转发头）误判客户端协议→NextAuth/CSRF/重定向异常，Flexible SSL（客户端 https、源站 http）尤需验证源站收到 `x-forwarded-proto=https`；⑤ 国内服务器直连 VNDB/Steam 做 ingest 可能不稳，但**本地库数据质量用户存疑（『一言难尽』），暂不假设可整体迁移**——Galvelica 填数方案待另行细查，不在本次部署前提；⑥ 低内存机 `next build` 2G 堆可能 OOM→需加 swap/降构建内存。③ 国内服务器直连 VNDB/Steam 做 ingest 可能不稳→建议用本地已 populate 的 Postgres(`D:\pgdata`，21,466 作品/封面 66.3%) `pg_dump` 迁过去，比服务器跑 ingest 更稳；④ 低内存机 `next build` 2G 堆可能 OOM→需加 swap/降构建内存。**（2026-07-27 用户二次修正：db/env/swap 服务器早已配好、部署成功且内容已测，故 ②NEXTAUTH_SECRET 重建掉登录 与 ④OOM 实际已由用户解决，非阻断项；剩余只需确认 Coolify env 显式设 NEXTAUTH_URL/SECRET 与 Cloudflare 代理协议头——详见下方「阻断级风险重评」）**
- **Coolify 注意点**：compose 中 `app` 默认发布 `${APP_PORT:-3000}:3000`，Coolify 通常走内部 proxy 不强制发布端口但发布不冲突；`backup` 服务无 profile→`up -d` 会随起(crond 每日 3 点备份，占少量资源，可接受)；`NEXTAUTH_URL` 必须与 Coolify 最终域名/SSL 完全一致。

## 环境限制（重要）
- ~~agent 环境网络层拦截 127.0.0.1:5432……连不上库~~ **已推翻（2026-07-26 实测）**：`dangerouslyDisableSandbox:true` 下 agent 直接 `npx tsx scripts/qa-ingest.ts` 成功连本地 Postgres 返回真实数据。该拦截本会话不成立。**以后要查库/跑 ingest 直接试，别先入为主推定连不上**；若某次真连不上再排查。
- **活 PG 数据目录在 `D:\pgdata`**（家 AI 把库迁到了 D 盘，已确认 `/d/pgdata/PG_VERSION`+`base/`），但连接串仍是 `.env` 的 `postgresql://fangame:fangame2024@127.0.0.1:5432/circleica`。127.0.0.1:5432 唯一占用即家 AI 写入的库，迁 D 盘不改变连接目标，**agent 跑 ingest/QA 不会写错库**。
- 离线回退：`src/lib/prisma.ts` Proxy 探测 SELECT 1 失败→读查询返回空（findMany→[]/count→0 等），绝不假数据；写操作 throw 阻止。
- Bash 重定向用 `2>/dev/null` 绝不用 `2>nul`（Git Bash 会写 `nul` 保留名垃圾文件触发 Turbopack 崩溃）；强删保留名文件用 `\\?\` 长路径前缀 + Win32 API。

## Galvelica 数据体系（2026-07-26 全阶段落地）
- 阶段 A-F 全部实现。广收录(VNDB 整批同人)是核心非可选；Stage C 回填仅种子。
- 严格同人闸门 `sources/doujin-gate.ts`：`GALVELICA_DOUJIN_ONLY` 默认 1 只收 VNDB/Bangumi；月幕等广义源设 0 放开；EGS 因中国 IP 墙未实现；nhentai/jandapress 等成人同人志(manga)排除。
- 接入源：VNDB/Bangumi/月幕YmGal/CnGal(用户令牌已写 `.env` 的 CNGL_API_TOKEN)/Steam发现层。CnGal+Steam 默认收录(DOUJIN_CURATED=[VNDB,BANGUMI,CNGL,STEAM])。
- **融合优先级铁律（用户 2026-07-26 强调「权威优先、高质量优先」）**：`fusion.ts` 的 FUSION_TABLE 必须按「每个字段谁最权威/质量最高谁排前」编排，且不能漏掉任何已接入源。各源权威面：VNDB=canonical 元数据最权威(标题/原名/发售日/简介/社团/标签/Staff)；BANGUMI=中文译名/别名/简介质量最高；YMGAL=补中文译名/封面/制作人员(无 tags/无稳定社团名)；CNGL=国产同人封面与制作组完整(无 tags)；STEAM=高质量封面(header_image)+可靠发售日(仅放行 VN genre，但 release_date 格式偶不规整故发售日排最后兜底)；DLSITE=官方购买链接(预留)；MANUAL=站长人工兜底(外部权威源存在时让位，已锁定字段不受影响)。曾漏：STEAM 只在 steamAppId 出现，coverImage/releaseDate/description 三个数组漏接 → 已修(把 STEAM 补进对应数组并按权威排序)。
- **VNDB 收录关键坑（2026-07-26 踩过，ng 过滤语法【当晚已破解】）**：① **扁平 filter `["field","op","value"]` 完全正常**（curl 验证 `id=v17`/`search=fate` 均 200，生产在用）。② **server 端 ng(同人社团)关系过滤语法【已破解】**：正确过滤字段是 **`developer`（单数）**（`developers`/`producer`/`producers` 都错——`developers` 只是返回字段名），嵌套 producer 子过滤的 `type` 取值 `"co"`(公司)/`"in"`(个人)/`"ng"`(业余团体/同人社团)；正确写法 `["developer","=",["type","=","ng"]]`（curl 验证 200、`count:20905`、返回项确带 `developers.type:"ng"`）。`devstatus` 是合法过滤字段但是开发状态整数(0完成/1开发中/2取消)，与同人无关。**`ingest-vndb.ts` 默认 `FILTER=["developer","=",["type","=","ng"]]`**，服务端直接筛 → 只拉 ≈20.9k 条 ng VN（非全量 37k），API 调用少约 45%；循环内 `d.type==='ng'` 留作防御性二次校验。`GALVELICA_INGEST_FILTER` 现在可真正做 API 级过滤。③ **真实同人总数=20,905（占全量 37k 约 56%）**——家 AI 报的 11,385(~30%)是低估，其 ingest 实际只入库 10,578 条 VNDB（漏约 1 万条 ng）；封面回填(后台 7tsLMH, 本地 gate)跑完应补齐到 ~20,905。家 AI 的 ~40min 并非用了隐藏 ng 语法，而是翻全量 37k 本地 gate 的耗时（它同样没破解服务端 ng 过滤）。④ VNDB v2 fields 里 `image` 必须写 `image.url`（裸 `image` 报 "image object requires sub-field(s)"），`vndb.ts` normalize 取封面要兼容 `string | {url}`。⑤ 跑 ingest 用 `npx tsx scripts/ingest-vndb.ts`（沙箱下 `npm run` 不注入 node_modules/.bin/tsx 会找不到命令）；RESET 重抓封面用 `GALVELICA_INGEST_RESET=1`。⑥ **地理/中国网络无关**：VNDB 从本机直连可达，400 是请求格式错（任何 IP 发同样错请求都 400），不是被墙（被墙会超时/连接拒绝）。
- **⑦ VNDB 429 限流被 `listVisualNovels` 吞掉（2026-07-26 踩，致命）**：`src/lib/vndb.ts` 的 `listVisualNovels`（~line 321）用 `try/catch` 捕获**所有**错误（含 429 Throttled）并返回 `{results:[],more:false}`。因此调用方（ingest）**永远收不到 429**，会把限流误判为「目录末尾」提前退出——这是当时「后台进程总被回收」假象的真凶（实为每次跑几十页就遇限流空页退出）。修复在 `scripts/ingest-vndb.ts` 侧：① 空页不立即判末尾，重试同页（阈值 20，退避 `min(30000,3000*streak)`）；② 只有目录第 1 页（`page===1`）空才报查询错误；③ 429 重试改「永不抛错、最多 60 次指数退避、一旦限流永久降速」。若以后要让 429 真正上抛，应改 `listVisualNovels` 对 429/Throttled 单独 `throw` 而非吞。
- 资料馆填充焊进部署：`ingest` 服务(docker-compose profiles:[ingest], build.target:builder 复用含 src+tsx 构建阶段)+`ingest-entrypoint.sh`(DB等待+幂等断点续跑：backfill→vndb→cngal→discovery，月幕仅 DOUJIN_ONLY=0)；DEPLOYMENT.md 两方式均写「填充可选但推荐」。新机=`docker compose up -d`+可选 `docker compose run --rm ingest`，零额外手动代码。
- **跨源融合去重（2026-07-26 完成，可复现）**：`scripts/dedup-cross-source.ts`（默认 DRY-RUN，`--apply` 执行，`--all` 列全簇）把 VNDB/CnGal 等同作合并为单 Work。关键坑：① **`KEEP_RAW=0` 下 raw 已被清空**，所以合并时**绝不能靠重拉 raw 再 `fuseWork`**——必须直接按 `FUSION_TABLE` 优先级合并已融合标量字段（权威优先、高质量优先）+ 平移 WorkTag/WorkCreator 行 + 把次要 Work 的 WorkSource 改挂主 Work（`@@unique([workId,source])` 冲突则删次要行）。② **标量合并必须在删次要 Work 之前做**，否则丢失次要源的封面/简介。③ 匹配键阈值：长键(≥3)用 ±1.5 月发售日容差；短键(2 字中文标题，如"春风/空陆")要求发售日**精确同日**，否则"再见/幻觉"等常见词会误并。④ 必须**强制跨源**（同源不合并），避免把真正不同的同源作品并掉。结果：Work 21,722→21,466（删 256 重复），qa「疑似重复组」归零，字段完整度零退化。
- **ingest 去重防护（防重跑再生重复）**：`work-service.ts` 新增 `buildCrossSourceIndex()`（ingest main 起点建内存倒排索引）+ `findCrossSourceMatch()`（在 `upsertWorkFromRaw` 新建 Work 前先查跨源匹配、命中则把新源挂到已有 Work 而非新建；未建索引时回退原行为、零回归）。`ingest-vndb.ts`/`ingest-cngal.ts` 已接线。已合并作品靠 `(source,externalId)` 唯一性在重跑时复用，不会复发。
- tsc 0 error；改动文件 eslint 0 error。
- **next/image 图床白名单（2026-07-27 运行时报错，已修）**：`next.config.ts` 的 `images.remotePatterns` 必须包含 Galvelica 所有封面源域名，否则 `next/image` 在 SSR 阶段直接抛 `Invalid src prop ... is not configured under images` 整页崩（`SafeImage` 的 onError 兜底救不了，因为域名校验先于 onError 执行）。已按 DB 实测封面域名补全：`t.vndb.org`/`s.vndb.org`/`res.cngal.org`/`tucang.cngal.top`/`*.cngal.org`/`*.cngal.top`/`shared.cdn.queniuqe.com`/`media.st.dl.eccdnx.com` + 前瞻 Steam(`shared.cloudflare.steamstatic.com`/`cdn.cloudflare.steamstatic.com`/`shared.akamai.steamstatic.com`/`store.steampowered.com`)/Bangumi(`*.bgm.tv`/`lain.bgm.tv`)/月幕(`images.yam-gal.com`/`*.ymgal.net`/`*.ymgal.org`)。**改 next.config 必须重启 dev server 才生效**（Next 启动时读配置）。
- **dev server 重启须知（2026-07-27）**：agent 用 `run_in_background` 起的进程跑在隔离 netns，用户浏览器（宿主 localhost:3000）连不上、前台 Bash 的 netstat 也看不到。要让 server 可达用户浏览器，必须用 `nohup ... & disown` 在 `dangerouslyDisableSandbox:true` 的**前台** Bash 里起（宿主 netns），并立刻用同一 shell 的 netstat 确认 `:3000 LISTENING`。dev 脚本：`node --max-old-space-size=4096 node_modules/next/dist/bin/next dev -p 3000`（日志落 D 盘）。验证白名单是否生效：直接打 `/_next/image?url=<编码后远程图>&w=256&q=75`，白名单内域名返回 200 image/*，未配置域名返回 `"url" parameter is not allowed`。

## 首页骨架屏行为（已知）
- 首页仅游戏网格有 `<Suspense fallback={<GameGridSkeleton/>}>`（page.tsx:240）；无 `src/app/loading.tsx`；公告区 `{announcements.length>0 && <AnnounceSwiper/>}` 无骨架。
- 现象「仅刷新可见骨架、客户端导航不可见」=Next.js 流式 SSR + prefetch 预期行为：硬刷新服务端重渲染→Suspense 回退先流出→见骨架；客户端软导航时 Link 已 prefetch RSC 负载、数据就绪→回退不渲染。

## 主题色 / Design Token 体系（2026-07-26 重构，根治「颜色被加深」老 bug）
- **用户三次反馈的核心 bug**：按钮/标签/选中态/tab 比主题色深太多、自定义主题色改了没反应、404(global-error)是原始硬编码样式。根因：① `resolveTokens` 自定义色静默回退薄荷预设（所以「改了跟没改一样」）；② hover/active 用机械 darken(700/800/900) 或实心 `--primary` 到处糊；③ `--theme-alpha` 是死控制（设了没人消费）；④ `global-error.tsx` 全硬编码 `#0a0a0a`/`#3b82f6`/橙渐变；⑤ 业务组件大量 `red-500/amber-500/emerald-500` 散落。
- **修复架构（已落地）**：
  - 派生令牌搬到 `src/lib/theme-colors-shared.ts`：`resolveThemeTokens(hex)` 预设走手工 token，自定义色走 `deriveTokensFromHex`（primary=hex, accent=lighten 18%, ring/glow=rgba）。客户端 `theme-colors.ts` 与 SSR `theme-script.tsx` 都 import 它 → 自定义色真正生效。
  - **悬停/按下/软着色全部交给 CSS（`globals.css`）用 `color-mix(var(--primary) …)` 实时派生**，绝不机械加深：hover=向白提亮、active=更亮一档、solid 按钮 hover 用 `--primary-strong`；新增 `--primary-soft/--primary-softer/--primary-selected/--primary-border/--primary-strong`。JS 不再写 `--primary-hover/--active`（`theme-script` 也不再写 `--accent`，保持中性）。
  - **`--theme-alpha` 改为百分比值**（默认 `15%`），直接驱动 `--primary-soft` 等软着色（`color-mix(… var(--theme-alpha) …)`），后台「背景透明度」滑块现在真生效（0%=无着色）。`theme-provider.tsx`/`theme-editor.tsx` 的 setProperty 同步改成 `+ "%"`。
  - 消费端改为软着色：`.badge-theme`/`span.bg-primary`、`.pagination-btn.active`、`.game-card-tag` 改用 `--primary-soft/--selected/--border`；`.forum-tab-btn` 选中态从死灰块 `#222224` 改为主题色软着色（`--tab-active` 改 `color-mix(primary 16% transparent)`）；`a.text-primary:hover` 改为提亮(`--primary-strong`)不加深。
  - **Button/Badge 变体**：`button` default hover→`bg-primary-strong`、新增 `soft` 变体；`badge` default→软着色（`bg-primary-soft text-primary border-primary-border`），`warning/success`→`--warning/--success` 语义令牌，`destructive-solid`→`--destructive`。
  - **`global-error.tsx`** 全改 `var(--background/--foreground/--primary/--primary-foreground/--border/--card/--destructive)`，跟主题走，不再原始样式。
  - **语义彩虹收束**：`globals.css` 新增 `:root:not(.light)` 覆盖块，将 `red/rose→--error`、`emerald/green→--success`、`amber→--warning`、`blue/sky→--info` 的常用 `/5~/10~/15~/20~/25` 背景、`text-*`、`ring-*/20` 统一路由到语义令牌（用 `color-mix` 精确还原透明度）。**刻意保留**有意为之的多色编码（勋章/排行/头像渐变/分类紫）不收束。
- **铁律（防复发）**：① 任何主题色派生 hover/active/软着色一律走 `color-mix(var(--primary)…)`，禁止 JS 机械 darken 到 700/800/900；② 自定义主题色必须走 `resolveThemeTokens` 真派生，禁止静默回退预设；③ `--accent` 保持中性（shadcn hover 底），不要被主题色覆盖；④ 业务状态色用 `--error/--warning/--success/--info` 令牌而非裸 `red-500` 等；⑤ **`THEME_PRESETS`/`DEFAULT_TOKENS` 的 `hover`/`active` 必须 lift（与 `deriveTokensFromHex` 同款 lightenHex），不得写死加深值**——`applyThemeTokens` 会把 `tokens.hover/active` 写进实时 CSS 变量，`resolveThemeTokens` 预设分支会直接返回它们，写死加深值会经此通道回灌成「选中态/按下态变深」；`--theme-color-hover/--theme-color-active/--gal-accent-strong` 等遗留变量现已全部指向 `var(--primary-hover)`/`var(--primary-active)`，禁止再留加深硬编码兜底。
- **隐藏陷阱已补（2026-07-27 续修）**：上一轮只把按钮渲染改走 CSS `color-mix`，但数据源 `THEME_PRESETS` 8 套预设 + `DEFAULT_TOKENS` 的 `hover/active` 仍是加深值（`#4d918a/#40807a` 等），且 `globals.css` 的 `--theme-color-hover/--theme-color-active`（:root/.light/.galvelica-root/.light .galvelica-root）及 `--gal-accent-strong` 留着加深兜底。实战路径：`ThemeProvider` 客户端 effect 跑 `applyThemeTokens(resolveThemeTokens(presetColor))` → 把加深的 `hover/active` 写进实时变量（虽当时未被渲染读取，但是个一触即发的回归雷）。已将所有预设 `hover/active` 改为 lightenHex 提亮值、所有遗留兜底变量改为 `var(--primary-hover/active)`，从数据源根除「机械加深」。**注意**：`--theme-color-hover/--theme-color-active` 当前是「死变量」（无任何 CSS/组件读取），保留为 `var(--primary-hover)` 仅为防御；若未来有人想用它做「悬停色」，应直接读 `--primary-hover` 而非复活加深逻辑。
- 验证：tsc 0 error、eslint 0 error（仅历史 `any` 警告）。**未跑 `next build`**（与用户运行中的 dev server 共用 `.next` 会冲突）；用户部署时构建即可。
