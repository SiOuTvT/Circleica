# Fangame 项目代码审查报告（Production-Ready Review）

> 审查人：Senior Developer（高级开发工程师）
> 审查范围：整个 `src/` 代码库（约 46,875 行 TS/TSX）、`next.config.ts`、`middleware.ts`、Docker 配置、Prisma schema
> 审查标准：商业项目 / Production Ready（非"能运行"标准）
> 审查方式：逐文件精读核心层（lib / services / 关键 API / 上传链路）+ 两个并行广度审计 Agent（后端 admin+repository、前端+基础设施）+ 对高危结论逐一回源核验

---

## 一、总体评价

项目整体工程素养**明显高于平均水平**：三层架构（Route → Service → Repository）清晰；统一错误处理 `withHandler` + `AppError`/`ZodError`；认证在 Service 层**重新从 DB 读取最新角色**（及时效角色变更）；富文本用 DOMPurify 净化且禁用 `style`/`data:` 脚本执行；上传链路用 `sharp` 校验真实图片；Setup 路由用 Serializable 事务防重初始化；无散落的 `console.log`、无 TODO/FIXME 死代码；CSP 策略较强（nonce + strict-dynamic + 禁止 object-src）。

但**在权限边界、数据一致性、错误映射、代理安全头、规模化性能**等方面存在若干 Production 级隐患。下面按严重度列出，每条均含"原因 / 影响 / 修复建议 / 是否值得修"。

---

## 二、高危（生产前必须修复）

### 🔴 H1 — ADMIN 可私自提升 USER → ADMIN（权限提升）
- **位置**：`src/app/api/admin/users/[id]/route.ts:12`（`PUT` 仅 `requireAdminRole()`）；`src/services/admin.ts:473-489`（`updateRole`）
- **原因**：中间件 `superAdminRoutes` 把 `/admin/users` 声明为 SUPER_ADMIN 专属，但 API 的 `PUT` 路由只要求 `ADMIN`。服务层 `updateRole` 仅拦截"设为 SUPER_ADMIN"和"修改 SUPER_ADMIN"，**未禁止 ADMIN 把普通 USER 提升为 ADMIN**。
- **影响**：任意管理员可自我扩充管理员队伍，绕过声明的 SUPER_ADMIN 边界，构成权限提升。
- **修复**：`PUT` 路由改为 `requireAdminRole("SUPER_ADMIN")`；或在服务层禁止非 SUPER_ADMIN 修改他人角色。
- **值得修**：**是（高优先级）**。

### 🔴 H2 — 反向代理后 HSTS 永不下发 + 未信任代理（SSL 剥离风险）
- **位置**：`src/middleware.ts:86-92`（仅当 `req.nextUrl.protocol === "https"` 才下发 HSTS）；`next.config.ts` 无 `server.trustProxy`
- **原因**：在 TLS 终止的反向代理（nginx / Traefik / Coolify）后，容器内请求协议恒为 `http`，因此 `req.nextUrl.protocol` 永远是 `http`，HSTS 永远不发；且未声明 `trustProxy`，任何依赖"安全"判断的逻辑不可靠。
- **影响**：公网 HTTPS 站点缺失 HSTS，存在协议降级 / SSL 剥离攻击面。
- **修复**：用 `req.headers.get("x-forwarded-proto") === "https" || req.nextUrl.protocol === "https"` 判定安全；`next.config.ts` 增加 `server: { trustProxy: true }`；部署后验证响应头出现 `Strict-Transport-Security`。
- **值得修**：**是（尤其公网 HTTPS 部署；若 Next.js 直接终结 TLS 则当前可用，但仍建议改为代理感知写法）**。

### 🟠 H3 — 错误且多余的 `X-Forwarded-Proto: http` 响应头
- **位置**：`next.config.ts:28-35`（`headers()` 对所有路由设置 `X-Forwarded-Proto: http`）
- **原因**：这是**响应**头，不会改写请求侧协议，本身不影响 NextAuth（`auth.ts` 的 `isSecure` 依据 `NEXTAUTH_URL` 而非该头，JWT cookie 判断正确）。但它属于错误/无意义配置，若上游误信该响应头会把流量判为明文。
- **影响**：配置 footgun，无实际收益。
- **修复**：直接删除该自定义头（HTTPS 检测应依赖**请求**侧由 TLS 代理设置的真实 `x-forwarded-proto`）。
- **值得修**：**是（低风险、易修）**。

---

## 三、中危（应修复）

### M1 — `withHandler` 不映射 Prisma 错误，预期内异常泄漏为 500（系统性）
- **位置**：`src/lib/api-handler.ts:103-134`
- **原因**：仅处理 `AppError` 与 `ZodError`，其余（Prisma `P2002`/`P2025`/`P2003`、连接错误）全部落入"未知 → 500"。
- **影响**：唯一键冲突、外键冲突、记录不存在等**预期内**错误都返回不透明 500，前端无法友好提示，且掩盖真实故障。连带放大了 M2/M3 等竞态问题。
- **修复**：增加 Prisma 错误映射（`P2002→409`、`P2025→404`、`P2003→422/409`），未知错误结构化记录。
- **值得修**：**是（根因型修复，连带缓解多个 500）**。

### M2 — 情感消息创建 check-then-act，并发唯一键冲突 → 500
- **位置**：`src/services/admin.ts:207-219`；schema `EmotionalMessage.key @unique`
- **原因**：先 `findByKey` 再 `create`，并发相同 key 都会通过读检查，第二个 `create` 触发 `P2002`，且因 M1 未映射 → 500。
- **影响**：并发创建重复 key 抛未处理异常；即便非并发，"先查后建"在唯一约束下冗余且脆弱。
- **修复**：事务内 `create` 并捕获 `P2002` → `ConflictError`，或直接 `upsert`。
- **值得修**：**是**。

### M3 — 并发同日签到 → P2002 → 500
- **位置**：`src/repositories/user.ts`（`checkinRepo.create` 裸 `create`）+ `src/services/user.ts:398-404`（先 `findByDate` 再 `create` 的 TOCTOU）
- **原因**：`CheckIn @@unique([userId, date])`，无冲突处理，并发同日签到触发唯一冲突。
- **影响**：正常用户并发签到可能得到 500。
- **修复**：`create` 包 try/catch 捕获 `P2002`（视为已签到），或在事务内处理。
- **值得修**：**是**。

### M4 — 删除收藏 / 删除用户时 `favoriteCount` 计数器不回退
- **位置**：`src/services/admin.ts:647-651`（后台删收藏直接 `prisma.favorite.delete`）；`src/repositories/admin.ts:436-441`（删用户级联删 `Favorite` 走 DB 层，绕过应用层 decrement）；对照 `src/repositories/game.ts:98-103`（正常 `removeFavorite` 会 `decrement`）
- **原因**：应用层计数器的递减逻辑只在 `removeFavorite` 走，后台删除与级联删除绕过了它。
- **影响**：被收藏过的游戏 `favoriteCount` 永久虚高，前端计数失真。
- **修复**：删除前对对应 `Game.favoriteCount` 做 `decrement`，或删除后用 `count()` 重算。
- **值得修**：**是（数据失真，规模化后难纠正）**。

### M5 — 签到"今天"时区边界不一致（功能正确性）
- **位置**：`src/services/user.ts:399-400, 421-422`（用 `toLocaleDateString("sv-SE", {timeZone:"Asia/Shanghai"})` 取日期字符串）与 `406-416`（streak 用 `expected.toISOString().split("T")[0]` 即 UTC 比较）
- **原因**：`new Date(todayStr + "T00:00:00")` 被当作**服务器本地时区**解析，而非上海时区；而 streak 计算用 UTC 日期。两者基准不一致。
- **影响**：跨时区 / 跨午夜时签到边界错乱，用户可能"重复签到"或连签天数断裂。
- **修复**：全程统一——要么都用服务器时区，要么都用显式的 `Asia/Shanghai` 构造 `Date` 并与记录按同一基准比较。
- **值得修**：**是**。

### M6 — forumPost / comment 的 `imageUrl` 与 profile 的 avatar/banner 未做 URL 校验
- **位置**：`src/services/forum.ts:37-42, 103`（`imageUrl: raw.imageUrl ? String(raw.imageUrl) : ""`）；`src/services/user.ts:268-269`（`data.avatar = String(raw.avatar)`，无 scheme 校验）
- **原因**：仅 `String()` 强转，未限制协议。
- **影响**：可存入 `javascript:`/`data:` 等任意 URL（`<img>` 上下文不执行脚本，但属脏数据，且 avatar 可能在他处被用作 `background-image`/link，扩大攻击面）。
- **修复**：用 `sanitizeUrl()` / Zod `z.string().url()` 并限制 `http`/`https`。
- **值得修**：**是（安全卫生）**。

### M7 — ADMIN 可改写全局资源标签（应为 SUPER_ADMIN）
- **位置**：`src/app/api/admin/resource-tags/route.ts:10-18`（仅 `requireAdminRole()`）；middleware `superAdminRoutes` 含 `/admin/resource-tags`
- **修复**：路由改 `requireAdminRole("SUPER_ADMIN")`。
- **值得修**：**是**。

### M8 — 中间件 SUPER_ADMIN 闸门对 `/api/admin/**` 完全不生效（结构性）
- **位置**：`src/middleware.ts:54`（`pathname.startsWith("/admin")` 不匹配 `/api/admin/...`）
- **原因**：中间件的管理员限制只作用于页面路由；所有数据接口以 `/api/` 开头，永远不匹配。真实防线完全依赖每个路由各自调用 `requireAdminRole(...)`。
- **影响**：产生"已做 SUPER_ADMIN 限制"的虚假安全感；新增管理接口若忘记加守卫，会静默降级为 ADMIN（甚至 USER）可访问。
- **修复**：中间件同时覆盖 `/api/admin`，或封装统一守卫；当前仅作纵深防御。
- **值得修**：**是（防御性）**。

### M9 — 首页搜索用 ILIKE，与 `/search` 全文检索不一致且大表全扫
- **位置**：`src/lib/filters.ts:67-73`（`contains` + `mode:"insensitive"`）vs `src/app/search/page.tsx:61`（`searchVector.search(q)` 全文检索）
- **影响**：首页 `?q=` 随 `games` 表增长显著变慢，且与 `/search` 体验/结果割裂。
- **修复**：首页搜索统一走 `searchVector` 全文检索，或加 `pg_trgm` GIN 索引并改用对应查询。
- **值得修**：**是（规模化必做）**。

### M10 — `Game` / `Comment` 缺 `@@index([createdAt])`，仪表盘 groupBy 全表扫描
- **位置**：`prisma/schema.prisma`（`Game` / `Comment` 模型）；`src/app/admin/page.tsx:96-132`（`groupBy(by:"createdAt", where:{createdAt:{gte}})`）
- **影响**：每次加载仪表盘都对 games / comments 全表扫描，规模化后变慢。
- **修复**：给 `Game` 与 `Comment` 各加 `@@index([createdAt])`。
- **值得修**：**是（规模化必做）**。

### M11 — `tagGroup.positions` 直接 `String()` 致数据损坏
- **位置**：`src/services/admin.ts:259, 270`（`positions: raw.positions ? String(raw.positions) : "[]"`）
- **原因**：若客户端传入对象/数组，`String()` 得到 `"[object Object]"` 或逗号拼接串，存为 JSON；读取时 `JSON.parse` 失败静默变 `[]`。
- **修复**：校验为数组后 `JSON.stringify` 再存。
- **值得修**：**是**。

### M12 — `resourceTagService.getAll` 吞掉 JSON 解析错误
- **位置**：`src/services/admin.ts:531`（`catch { /* ignore */ }`）
- **影响**：存储值损坏时静默返回 `options = []`，管理员界面看不到也无法修复错误配置（数据静默丢失）。
- **修复**：解析失败记录日志并显式报错/告警。
- **值得修**：**是（可观测性）**。

### M13 — `cache.clear()` 在 Redis 模式是 no-op，但 `vndbClient.clearCache()` 依赖它失效
- **位置**：`src/lib/redis.ts:93-97`（`clear()` 仅 `logger.db.warn`）；`src/lib/vndb.ts:688`
- **原因**：`RedisCache.clear()` 未实现（Upstash 不支持通配符删除）。
- **影响**：启用 Redis 后，VNDB 缓存无法主动失效，TTL 内显示陈旧数据。
- **修复**：用带前缀的 `SCAN`+`DEL` 实现，或在 Redis 模式改用已知 key 集合删除。
- **值得修**：**是（若生产启用 Redis 并依赖 clearCache）**。

### M14 — docker-compose 硬编码弱口令
- **位置**：`docker-compose.yml:24-27`（`POSTGRES_PASSWORD: fangame` 等）
- **影响**：若此 compose 被用于非纯本地部署，数据库用广为人知的弱口令。
- **修复**：改 `${POSTGRES_PASSWORD}` 从密钥/env 注入，文档明确"仅限本地"。
- **值得修**：**是**。

---

## 四、低危 / 技术债（建议迭代清理）

### L1 — 重复组件（可维护性）
- `<Avatar>` 实现分散 4 处（`comment-section.tsx:32`、`forum-post-detail.tsx:29`、`forum/post-detail-modal.tsx:23`、`forum/forum-post-item.tsx:32`）；`EMOJI_LIST` 两份（`forum-post-detail.tsx:23`、`forum/post-detail-modal.tsx:29`）；`ForumPostDetail`（桌面整页）与 `PostDetailModal`（移动弹层）平行实现，评论提交/点赞/删除逻辑重复且**行为已分化**（弹层缺回复、锁定态、分享，viewCount 计算不同）——`forum-post-detail.tsx` vs `forum/post-detail-modal.tsx`。
- **修复**：抽取共享 `<Avatar user size />` 与 `formatRelativeTime()`；统一表情常量；将帖子+评论渲染合并为单一组件按 `layout: "page" | "modal"` 参数化。
- **值得修**：**是（长期维护成本，行为漂移会持续产生 bug）**。

### L2 — 无效 JSON 请求体 → 500 而非 400
- **位置**：各路由 `req.json()` 未 try/catch（如 `src/app/api/auth/register/route.ts:10`）。`withHandler` 捕获 `SyntaxError` 时应返回 400。
- **修复**：用 `api-handler` 版 `parseBody`（带 Zod），或包裹 `req.json()`。
- **值得修**：**是（小修）**。
- 附带：① `src/lib/api-handler.ts` 的 `parseBody` 全项目**未被使用**（死代码）；② `src/lib/validations.ts` 另有同名 `parseBody` 返回 union 类型 —— 两处同名函数易混淆，建议统一。③ `RateLimitError.retryAfter` 字段在 `errorResponse` 中未被使用（硬编码 `Retry-After: 60`）。

### L3 — 可访问性
- `game-detail-client.tsx:267-273`：intro tab 缺 `role="tabpanel"` + `aria-labelledby`（resource/comments tab 有，不一致）。
- `top-nav.tsx:293,296,309`：图标按钮（主题切换、论坛）仅用 `title`，缺 `aria-label`。
- `top-nav.tsx:358`：登出时 `localStorage.clear()` 清空整个源存储，**误清主题 / NSFW 偏好**；应只删已知 key。
- **值得修**：**是**。

### L4 — 前端细节
- `forum-post-detail.tsx:238`：浏览量回退 `post.viewCount ?? (post.commentCount + post.likeCount)` 显示误导性的"浏览 N"。
- `forum-post-detail.tsx:205-211`：`sharePost` 复用 `imageError` 状态显示成功 toast，语义错乱。
- `comment-section.tsx:249`：重试按钮伪造事件对象 `submit({ preventDefault: () => {} } as React.FormEvent)`。
- **值得修**：**低**（默认 0 / 用 `toast.success` / 抽纯函数 `doSubmit()`）。

### L5 — 深色模式硬编码色
- `games/[id]/page.tsx:289`、`admin/page.tsx:201` 等用硬编码 `bg-blue-500/10 #d87070 emerald` 而非主题 token，深色模式下不随变量变化。
- **值得修**：**低**（品牌色场景可接受，建议统一）。

### L6 — 审计 / 文件清理失败被静默吞掉
- `src/services/admin.ts` 多处 `logAudit(...).catch(() => {})`；头像帧/合成头像文件清理 `catch {}` 吞掉错误。
- **修复**：至少 `logger.error` 记录 rejection，区分"文件不存在（可忽略）"与"IO/权限错误（需告警）"。
- **值得修**：**是（可观测性）**。

### L7 — `reactStrictMode: false`
- **位置**：`next.config.ts:39`。关闭开发期 effect 双调用，可能掩盖清理/内存泄漏类 bug。
- **修复**：设为 `true` 或删除（默认即 true）。
- **值得修**：**低（开发期安全网）**。

### L8 — CSP `connect-src` 未含 `utfs.io` / `uploadthing`
- **位置**：`src/middleware.ts:31`。若前端直传 UploadThing，可能被 CSP 拦截。
- **值得修**：**低（视上传实现而定，建议确认）**。

### L9 — 未防护"删除 / 降级最后一名 SUPER_ADMIN"
- **位置**：`src/services/admin.ts:491-501`（`delete` 只阻止删自己 / 删 SUPER_ADMIN）、`473-489`（`updateRole` 可把唯一 SUPER_ADMIN 降为 ADMIN）。
- **影响**：可能导致后台无可用的超级管理员（锁死）。
- **修复**：操作前统计剩余 SUPER_ADMIN 数，≤1 时拒绝。
- **值得修**：**低（极端场景）**。

### L10 — 孤儿上传文件永不清理（存储泄漏）
- **位置**：`src/lib/storage.ts` 的 `delete()` **全项目从未被调用**（grep 确认仅文档引用）。
- **影响**：用户更换头像 / 上传图片后，旧文件永不删除；服务端存储持续膨胀。
- **修复**：在头像/封面更新、资源删除等路径调用 `storage.delete(oldKey)`；并清理 `storage.delete` 中 `path.join(uploadDir, key)` 的潜在路径穿越（当前因 key 全为服务端生成而未触发，但若将来接受用户输入需先校验 `key` 不含 `..`）。
- **值得修**：**低-中（存储成本）**。

---

## 五、第二轮复查（遗漏确认与补充）

为确认无遗漏，对第一轮结论做了交叉核验与补充扫描：

1. **Setup 路由（安全性）**：`src/app/api/setup/route.ts` 用 **Serializable 事务**原子检查 `initialized` 标志 + `userCount`，防重初始化设计良好——**非问题**。确认无权限提升风险（初始化后返回 `ConflictError`）。
2. **富文本净化**：`rich-text-content.tsx` / `intro-tab.tsx` 用 DOMPurify，禁用 `style`/`data:` 脚本执行，`javascript:` 由 DOMPurify 内置剥离——**稳健**。仅补充：富文本中 `target="_blank"` 链接缺 `rel="noopener noreferrer"`（轻微反向 Tabnabbing），建议在净化配置加 `ADD_ATTR: ["rel"]` 或后处理。**低**。
3. **`storage.delete` 路径穿越**：确认未被调用 → **当前无风险**；列为 L10 的"若未来接入用户输入需先校验"。
4. **用户删除权限**：确认 `DELETE /api/admin/users/[id]` 要求 `SUPER_ADMIN`，且服务层阻止删自己、删 SUPER_ADMIN——**正确（非问题）**，仅 L9 的"最后一名"边界待补。
5. **管理员资源删除**：`games/[id]/resources/[resourceId]` DELETE 正确传入 `auth.role`（服务端），ADMIN 可删任意资源——**正确**。
6. **管理员评论删除缺口**：公开 `forum/comments/[id]` DELETE 调 `deleteComment(userId, id)`（默认 `isAdmin=false`），**管理员无法经 API 删除用户评论**（管理后台仅有帖子删除 `admin/forum`）。属** moderation 能力缺口**——建议补 `admin/comments/[id]` 或让公开路由在 `requireAdminRole` 下传 `isAdmin=true`。**中（运营影响）**。
7. **速率限制应用面**：`checkRateLimit` 仅在部分路由调用（auth/register/passwordReset/upload）。其他写接口（发帖、评论、收藏、签到等）未统一限流——少数高频写操作缺防护，建议对写类接口统一接入。**低-中**。
8. **`serial-id` / `uid` 生成**：setup 与 register 均生成 `serialId`+`uid`，逻辑一致——**非问题**。

---

## 六、修复优先级建议

| 优先级 | 条目 | 性质 |
|--------|------|------|
| P0（上线前必修） | H1 权限提升、H2 HSTS/代理、M1 Prisma 错误映射、M4 计数器一致性、M5 签到时区 | 安全 + 数据正确性 |
| P1（上线前） | H3 删错头、M2/M3 竞态、M6 URL 校验、M7/M8 权限边界、M9/M10 性能索引、M11/M12 数据质量、M13 缓存失效、M14 弱口令、L11 评论管理缺口 | 安全/数据/性能 |
| P2（迭代） | L1 重复组件、L2 死代码/400、L3 可访问性、L5 深色色、L6 日志、L7 strictMode、L9 最后超管、L10 孤儿文件、速率限制覆盖 | 技术债/体验 |

---

## 七、结论

项目架构与代码质量在同类社区项目中属于**中上水平**，核心安全骨架（认证、富文本净化、CSP、事务防重初始化）扎实。但存在 **1 项明确的权限提升（H1）** 与 **1 项代理安全头缺失（H2）** 必须在生产前修复；另有若干**数据一致性（M4/M5）、错误映射（M1，根因型）、规模化性能（M9/M10）** 问题会在用户量增长后逐步暴露。建议按 P0→P1→P2 顺序推进，其中 **M1（Prisma 错误映射）是性价比最高的一处修复**，可连带消除多个 500 泄漏。

（注：以上结论均已对高危项回源核验；广度审计由并行 Agent 完成，结论与精读一致。）
