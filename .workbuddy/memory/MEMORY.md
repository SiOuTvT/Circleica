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
- agent 环境网络层拦截 127.0.0.1:5432（TCP 握手接住、真实 PG 协议掐断），agent 内一切进程（含 dangerouslyDisableSandbox）连不上库；沙箱还杀 PG 后台进程。唯一通库路径=用户桌面双击 `D:\Circleica\start-dev.bat`（本机进程绕开拦截）。`localhost:765` 经 agent 转发无库，别用。
- 离线回退：`src/lib/prisma.ts` Proxy 探测 SELECT 1 失败→读查询返回空（findMany→[]/count→0 等），绝不假数据；写操作 throw 阻止。
- Bash 重定向用 `2>/dev/null` 绝不用 `2>nul`（Git Bash 会写 `nul` 保留名垃圾文件触发 Turbopack 崩溃）；强删保留名文件用 `\\?\` 长路径前缀 + Win32 API。

## Galvelica 数据体系（2026-07-26 全阶段落地）
- 阶段 A-F 全部实现。广收录(VNDB 整批同人)是核心非可选；Stage C 回填仅种子。
- 严格同人闸门 `sources/doujin-gate.ts`：`GALVELICA_DOUJIN_ONLY` 默认 1 只收 VNDB/Bangumi；月幕等广义源设 0 放开；EGS 因中国 IP 墙未实现；nhentai/jandapress 等成人同人志(manga)排除。
- 接入源：VNDB/Bangumi/月幕YmGal/CnGal(用户令牌已写 `.env` 的 CNGL_API_TOKEN)/Steam发现层。CnGal+Steam 默认收录(DOUJIN_CURATED=[VNDB,BANGUMI,CNGL,STEAM])。
- 本机必跑：`prisma migrate dev --name galvelica_cngal`（新增 CNGL 枚举；agent 内 generate 因沙箱锁仅更新 TS 类型、引擎二进制 rename EPERM 拦）。迁移/回填/广收录命令见 package.json `galvelica:*`。
- 资料馆填充焊进部署：`ingest` 服务(docker-compose profiles:[ingest], build.target:builder 复用含 src+tsx 构建阶段)+`ingest-entrypoint.sh`(DB等待+幂等断点续跑：backfill→vndb→cngal→discovery，月幕仅 DOUJIN_ONLY=0)；DEPLOYMENT.md 两方式均写「填充可选但推荐」。新机=`docker compose up -d`+可选 `docker compose run --rm ingest`，零额外手动代码。
- tsc 0 error；改动文件 eslint 0 error。

## 首页骨架屏行为（已知）
- 首页仅游戏网格有 `<Suspense fallback={<GameGridSkeleton/>}>`（page.tsx:240）；无 `src/app/loading.tsx`；公告区 `{announcements.length>0 && <AnnounceSwiper/>}` 无骨架。
- 现象「仅刷新可见骨架、客户端导航不可见」=Next.js 流式 SSR + prefetch 预期行为：硬刷新服务端重渲染→Suspense 回退先流出→见骨架；客户端软导航时 Link 已 prefetch RSC 负载、数据就绪→回退不渲染。
