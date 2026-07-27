# Circleica 项目长期约定

## 设计总纲（2026-07-24，最高优先级）
- 目标：统一设计语言/浏览体验的完整产品，向 Galvelica 品质靠拢（精致/留白/层级/品牌感），非资源堆砌。
- 禁海报风（大 glow hero/戏剧留白/海报化排版，尤其首页）。主站≠资源站≠海报站=有品牌感的精致内容产品。
- 允许大胆重构，不必兼容旧设计。拿不准先出 2-3 具体方案让用户挑（用户铁律）。

## 产品定位（2026-07-25，最高优先级）
- Circleica=资源站（只展本站资源，搜只返本站）；Galvelica=同人向资料馆（收录同人 VN 生态，搜全资料库）。互补不重复。
- 搜索分治：Circleica 搜资源；Galvelica 搜资料。

## 信息架构 & 重构优先级
- IA：首页=展示(克制)；分类=浏览；搜索=查找；详情=阅读(最高)；发现=探索。
- 优先级：①详情页 ②统一工具栏 ③Game Card/列表 ④Discovery。

## 铁律
- 绝不注入假数据：DB 不可达时只渲染空状态/骨架框，不编造内容（用户红线）。
- 主题色 Setting 级高杠杆，薄荷绿默认。
- Galvelica 部署安全：所有改动纯加法、deploy 安全、不破坏现有 Docker+pm2；新增 env 全可选优雅降级；新模型=多一个迁移文件。

## 部署策略（2026-07-27 起，最高优先级）
- 战略转向：本地迭代 → 服务器(Coolify)部署。本地内存受限，所有改动走服务器部署，改前多查、力求一次解决。
- 协作边界（用户定稿）：用户=部署/测试/Git/服务器/Coolify/Cloudflare；agent=写代码与修网站（src/组件/页面/功能配置）。agent 绝不做 git/部署/服务器/Docker-infra。共享项目：大改动先简短知会，常规修 bug/写功能直接做。
- 服务器在中国大陆（Cloudflare 中转代理在应用之前）；测试机便宜配置低。
- Coolify env 须显式设 NEXTAUTH_URL(=域名 https)/NEXTAUTH_SECRET；Cloudflare 代理须正确覆写 X-Forwarded-Proto/For（Flexible SSL 源站须收到 x-forwarded-proto=https）。
- agent 写代码本职，但 git/部署/服务器一律不动；用户部署报错贴回，agent 再修。

## 环境限制（重要）
- agent 环境 `dangerouslyDisableSandbox:true` 下可直连本地 Postgres(`D:\pgdata`，连接串 `postgresql://fangame:fangame2024@127.0.0.1:5432/circleica`)；别先入为主推定连不上。
- 离线回退：`src/lib/prisma.ts` Proxy 探测 SELECT 1 失败→读返回空、写 throw，绝不假数据。
- Bash 重定向用 `2>/dev/null` 绝不用 `2>nul`；强删保留名文件用 `\\?\` 长路径前缀。

## Galvelica 同人定义 & 数据源铁律（2026-07-27 用户定稿，最高优先级）
- **同人定义（rule 2，站点采用）**：① 纯正同人=个人(in)/无注册社团(ng)，非商业主体，仅同人渠道分发——核心库；② 同人系公司=早年同人社团、后期注册公司的厂商全部作品——同人衍生拓展库（对外须与纯正同人分两类展示、明确定义区别）；③ 原生纯商业公司（柚子社/Key/5pb/Sphere 等，创立即商业）——永久排除。
- **VNDB 收录过滤（已实现）**：`ingest-vndb.ts` 默认 `FILTER=["or", developer.type=ng, developer.type=in, developer.id∈同人系公司白名单]`。`GALVELICA_DOUJIN_CO_IDS`（逗号分隔）可追加白名单。VNDB 无 doujin 布尔，只能按生产者类型判。
- **数据源权威铁律（用户 2026-07-27）**：优先用全球公认、国际圈通用、海外创作者/玩家认可的权威平台；**月幕(YmGal)/CnGal/KunMoe 全部排除**——不接 API、不批量爬、不依赖（原因：深度绑定国内同人/汉化/社团圈子，用户要保持独立中立、不碰国内圈人际关系）。
- **可用国际权威源**：VNDB（核心）、EGS/ErogameScape（日本权威 galge 库，因中国 IP 墙未实现）、Steam（发现层，仅 VN 类型）、DLsite（预留购买链接）。Bangumi 是否纳入待用户拍板（中文源，边界模糊）。
- **数据完整度**：优先靠海外数据源解决 95%+ 同人收录；中文译名/汉化/国产同人等国内独有信息，用户后期手动补充。
- **分类展示要求**：站点须区分「纯正同人作品」与「同人社团转型商业作品」两大分类并明示定义区别（需新增 doujinCategory 之类字段/标签，待实现）。

## Galvelica 数据体系实现笔记（落地细节）
- 阶段 A-F 全部实现；严同人闸门 `sources/doujin-gate.ts`：`DOUJIN_CURATED` 当前=VNDB/BANGUMI/STEAM（已移除 CNGL/YMGAL）；`GALVELICA_DOUJIN_ONLY` 默认 1。
- **VNDB 收录关键坑**：① 扁平 filter 正常；② server 端 ng 过滤正确写法 `["developer","=",["type","=","ng"]]`（developer 单数；type: co公司/in个人/ng业余团体）；`devstatus` 是开发状态整数无关同人；真实同人总数≈20,905（占全量 37k≈56%）。③ `image` 须写 `image.url`。④ 地理无关：VNDB 本机直连可达，400=格式错非被墙。
- **VNDB 429 限流被 `listVisualNovels` 吞掉（已修）**：空页不立即判末尾重试同页；429 永不抛错最多 60 次指数退避、一旦限流永久降速。若要 429 真上抛，改 `listVisualNovels` 对 429 单独 throw。
- **跨源融合去重（已完成）**：`scripts/dedup-cross-source.ts`（DRY-RUN，--apply 执行）按 FUSION_TABLE 优先级合并已融合标量字段+平移 WorkTag/WorkCreator+次要 WorkSource 改挂主 Work；标量合并须在删次要 Work 前。匹配键：长键(≥3)±1.5月容差；短键(2字)精确同日。强制跨源不合并同源。`work-service.ts` 的 `buildCrossSourceIndex`/`findCrossSourceMatch` 防重跑再生重复。
- 融合优先级铁律：权威优先、高质量优先，不漏任何已接入源（VNDB=canonical 最权威；BANGUMI=中文译名/别名质量最高；STEAM=高质量封面+可靠发售日排兜底；MANUAL=站长人工兜底）。
- 资料馆填充：`ingest` 服务(docker-compose profiles:[ingest])+`ingest-entrypoint.sh`(DB等待+幂等续跑)。
- next/image 白名单：须含所有在用封面源域名，否则 SSR 抛 Invalid src。当前含 vndb/bgm.tv 等；CNGL/YMGAL 域名待随排除一并清理（与数据 purge 联动，勿提前删以免已有封面 500）。
- tsc 0 error；eslint 0 error（仅历史 any 警告）。

## 首页骨架屏行为（已知）
- 仅游戏网格有 Suspense 骨架；客户端软导航不可见骨架=预期（prefetch 就绪）。

## 主题色 / Design Token 体系（2026-07-26 重构，根治「颜色被加深」老 bug）
- 根因：自定义色静默回退预设；hover/active 机械 darken；`--theme-alpha` 死控制；`global-error` 硬编码；业务组件散落 red-500 等。
- 修复：派生 `resolveThemeTokens`(src/lib/theme-colors-shared.ts) 自定义色走 `deriveTokensFromHex`；悬停/软着色全交 CSS `color-mix(var(--primary)…)` 提亮不加深；`--theme-alpha` 改百分比驱动软着色；Button/Badge 改软着色变体；`global-error` 跟主题；`globals.css` 加 `:root:not(.light)` 把红/绿/琥珀/蓝路由到 `--error/--success/--warning/--info` 语义令牌（保留勋章/排行/头像渐变/分类紫多色）。
- 铁律：① 派生一律 color-mix 提亮，禁 darken 700/800/900；② 自定义色走 `resolveThemeTokens` 真派生，禁静默回退；③ `--accent` 保持中性；④ 业务色用语义令牌；⑤ `THEME_PRESETS`/`DEFAULT_TOKENS` 的 hover/active 必须 lift（lightenHex），`--theme-color-hover/--theme-color-active/--gal-accent-strong` 全指向 `var(--primary-hover/active)`，禁留加深兜底。
