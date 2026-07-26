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

## 首页骨架屏行为（已知）
- 首页仅游戏网格有 `<Suspense fallback={<GameGridSkeleton/>}>`（page.tsx:240）；无 `src/app/loading.tsx`；公告区 `{announcements.length>0 && <AnnounceSwiper/>}` 无骨架。
- 现象「仅刷新可见骨架、客户端导航不可见」=Next.js 流式 SSR + prefetch 预期行为：硬刷新服务端重渲染→Suspense 回退先流出→见骨架；客户端软导航时 Link 已 prefetch RSC 负载、数据就绪→回退不渲染。
