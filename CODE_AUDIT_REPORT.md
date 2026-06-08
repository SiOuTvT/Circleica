# 代码审计报告

**审计日期**: 2026-06-09
**项目**: Fangame - Galgame/视觉小说社区平台
**技术栈**: Next.js 16 + React 19 + Prisma + PostgreSQL + NextAuth v5 + Tailwind CSS
**代码规模**: ~35,000 行 TypeScript/TSX，~150 个源文件，80+ API 路由
**审计方法**: 6 个并行代理逐一读取全部源文件 + 核心文件手动审查

---

## 总体评价

**整体评分: 7/10**

这是一个架构清晰、功能完整的 Next.js 全栈项目。代码风格统一，模块化程度较高，有良好的安全意识（CSP、速率限制、输入验证、环境变量验证）。但在类型安全、代码重复、性能优化等方面仍有改进空间。

**优点：**
- 统一的 API 响应格式 (`api-response.ts`)
- 完善的速率限制机制（Redis + 内存双后端）
- 环境变量验证 (`env.ts`)
- 安全中间件（CSP nonce-based、安全头、HSTS）
- 成就系统设计合理，支持多种条件类型
- 情感化消息系统可后台配置
- VNDB 集成完整，支持自动填充和标签翻译
- 统一的后台样式 Token (`admin-styles.ts`)
- 通用 API 客户端带超时、重试、错误分类 (`api-client.ts`)

---

## 问题清单

### 🔴 严重问题（必须修复）

#### 1. Stack Trace 泄露
- **文件**: `src/app/api/creators/random/route.ts`, `src/app/api/characters/random/route.ts`
- **问题**: `error.stack` 直接返回给客户端
- **影响**: 暴露服务器内部路径和库版本
- **修复**: 移除 `details: error.stack`，只返回通用错误信息

#### ~~2. `/api/admin/achievements/[id]` PUT Mass Assignment~~ ✅ 已修复
- **文件**: `src/app/api/admin/achievements/[id]/route.ts`
- **现状**: 已有 `UPDATABLE_FIELDS` 白名单，只允许更新特定字段

#### ~~3. `/api/admin/settings` 无键名白名单~~ ✅ 已修复
- **文件**: `src/app/api/admin/settings/route.ts`
- **现状**: 已有 `ALLOWED_KEYS` 白名单（`default_placeholder_image`, `site_name`, `site_description`, `registration_enabled`）

#### ~~4. 权限不一致 — emotional-messages `[id]` 路由~~ ✅ 已修复
- **文件**: `src/app/api/admin/emotional-messages/[id]/route.ts`
- **现状**: 已改用 `getAdminSession("SUPER_ADMIN")`

#### 5. 音乐上传权限检查不完整
- **文件**: `src/lib/uploadthing.ts:39`
- **问题**: `music` 上传中间件只检查 `role !== "ADMIN"`，遗漏了 `SUPER_ADMIN`
- **影响**: SUPER_ADMIN 无法上传音乐
- **修复**: 改为 `if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN")`

#### 6. `calculateCheckinStreak` 加载全部签到记录
- **文件**: `src/lib/achievements.ts:22-27`
- **问题**: `findMany` 无 limit，用户签到数年后会加载数千条记录
- **影响**: 严重性能问题，数据库压力随时间线性增长
- **修复**: 添加 `take: 365` 或只查询最近 60 天的记录（连续签到不可能超过注册天数）

#### 7. `getUserStats` 每次成就检查执行 8 个独立查询
- **文件**: `src/lib/achievements.ts:77-90`
- **问题**: 虽然用了 `Promise.all`，但每次调用都执行 8 个 COUNT 查询
- **影响**: 成就检查频繁调用时数据库压力大（签到、评论、收藏都会触发）
- **修复**: 考虑缓存用户统计数据（Redis，TTL 5分钟），或合并为单个原始 SQL 查询

#### ~~8. `/api/translate` 公开端点无认证无限流~~ ✅ 已修复
- **文件**: `src/app/api/translate/route.ts`
- **现状**: 已使用 `requireAdmin()` 保护，仅管理员可调用。但 `/api/admin/translate` 仍无 rate limiting，建议添加。

#### 9. 多个 API 无 `req.json()` 错误处理
- **文件**: `forgot-password`, `reset-password`, `profile/edit`, `rating`, `play-status`, `notifications` 等路由
- **问题**: 畸形 JSON 请求体导致未处理的 500 错误
- **影响**: 服务器错误信息可能泄露，用户体验差
- **修复**: 使用 `parseBody()` 工具函数或包裹 try/catch

#### 10. `next-auth` 使用 Beta 版本
- **文件**: `package.json:35`
- **问题**: `^5.0.0-beta.31` 不是稳定版
- **影响**: 认证系统可能有未知漏洞或 breaking changes
- **修复**: 评估是否回退到稳定版 v4，或锁定具体版本号

#### 11. resource-tags 路由使用原始 SQL 查询
- **文件**: `src/app/api/admin/resource-tags/route.ts:73-85`
- **问题**: 使用 `$queryRawUnsafe` 和 `$executeRawUnsafe` 构建 SQL，字段名通过字符串拼接
- **影响**: 虽然字段名来自内部映射（非用户输入），但模式不安全，未来修改可能引入注入
- **修复**: 使用 Prisma 原生查询替代原始 SQL

---

### 🟡 中等问题（建议修复）

#### 12. TypeScript 类型安全不足
- **文件**: `src/lib/logger.ts:9`、`src/lib/vndb.ts`、`src/lib/vndb-client.ts`
- **问题**: 多处使用 `any` 类型，`noImplicitAny` 在 tsconfig 中被关闭
- **影响**: 类型检查失效，潜在运行时错误
- **修复**: 定义具体接口替代 `any`，逐步启用 `noImplicitAny`

#### 13. `validations.ts` 与 `api-response.ts` 功能重复
- **文件**: `src/lib/validations.ts:142-166`
- **问题**: `apiSuccess()`、`apiError()`、`formatZodError()` 与 `api-response.ts` 中的函数功能完全重复
- **影响**: 代码维护困难，容易出现不一致
- **修复**: 删除 `validations.ts` 中的响应函数，统一使用 `api-response.ts`

#### 14. `storage.ts` 是死代码
- **文件**: `src/lib/storage.ts`
- **问题**: `saveFile()` 和 `deleteFile()` 函数未被任何地方使用，项目实际使用 R2 上传
- **影响**: 误导开发者，增加维护成本
- **修复**: 删除整个文件

#### 14. `unstable_cache` 用于 session 用户数据
- **文件**: `src/lib/auth.ts:8-17`
- **问题**: `unstable_cache` 的 revalidate 设为 30 秒，但用户更新头像后可能 30 秒内看不到变化
- **影响**: 用户体验不一致
- **修复**: 用户更新后主动 `revalidateTag("session-user")`

#### 15. Game 模型使用 JSON 字符串存储数组
- **文件**: `prisma/schema.prisma:118-119`
- **问题**: `screenshots`、`downloadLinks` 使用 `String @default("[]")` 存储 JSON
- **影响**: 无法查询、无法索引、序列化开销
- **修复**: 已有 `GameResource` 和 `GameResourceEntry` 模型，考虑迁移旧数据

#### 16. 错误处理不一致
- **文件**: 多个 API 路由
- **问题**: 部分路由用 `try/catch`，部分用 `withErrorHandler`，部分无错误处理
- **影响**: 错误响应格式不统一
- **修复**: 统一使用 `withErrorHandler` 包装

#### 17. `GameReport` 存储原始 IP 地址
- **文件**: `prisma/schema.prisma:283`
- **问题**: 直接存储原始 IP，无哈希处理
- **影响**: 隐私合规风险（GDPR 等）
- **修复**: 存储 IP 哈希（`SHA256(ip + salt)`）而非原始 IP

#### 18. `x-forwarded-for` 头可伪造
- **文件**: `src/app/api/games/[id]/view/route.ts`、`src/app/api/games/[id]/report/route.ts`
- **问题**: 在无代理的情况下，客户端可伪造 `x-forwarded-for` 头
- **影响**: 可绕过基于 IP 的限流/去重
- **修复**: 仅在可信代理后使用该头，否则使用连接 IP

#### 19. Sentry Tunnel DSN 验证太松
- **文件**: `src/app/api/sentry/tunnel/route.ts`
- **问题**: `.endsWith("sentry.io")` 可匹配 `evil-sentry.io`
- **影响**: 可被利用作为开放代理
- **修复**: 改为 `.endsWith(".sentry.io")` 或精确匹配

#### 20. 内存缓存无 LRU 淘汰
- **文件**: `src/lib/redis.ts:120-192`
- **问题**: `MemoryCache` 使用 FIFO 淘汰（删除最早的 key），非 LRU
- **影响**: 热点数据可能被淘汰，缓存命中率低
- **修复**: 使用 LRU 策略或使用 `lru-cache` 库

#### 21. `rate-limit.ts` 内存存储全局共享
- **文件**: `src/lib/rate-limit.ts:20-33`
- **问题**: `memoryStore` 在 serverless 环境中每个实例独立，限流不准确
- **影响**: 多实例部署时限流失效
- **修复**: 文档说明或强制使用 Redis

#### ~~22. ReportResolveBtn 逻辑 Bug~~ ✅ 已修复
- **文件**: `src/app/admin/reports/resolve-btn.tsx` + `src/app/api/admin/reports/route.ts`
- **现状**: DELETE API 已支持 `gameId` 参数批量删除该游戏的所有举报

#### 23. `escapeHtml` 双重转义风险
- **文件**: `src/app/api/forum/posts/route.ts`
- **问题**: 存储时转义，渲染时 React 再次转义，可能显示 `&amp;amp;`
- **影响**: 用户看到转义后的文本
- **修复**: 存储原始文本，渲染时使用 DOMPurify 或 dangerouslySetInnerHTML

#### 24. 多个管理页面无自身权限检查
- **文件**: `/admin/copy`, `/admin/site-settings`, `/admin/avatar-frames`, `/admin/achievements`, `/admin/theme`, `/admin/resource-tags`
- **问题**: 完全依赖 layout.tsx 的 `SUPER_ADMIN_PATHS` 列表
- **影响**: 列表维护不及时会导致权限泄露
- **修复**: 每个页面添加 `requireSuperAdmin()` 调用

#### 25. `use-comments.ts` 是 God Hook
- **文件**: `src/components/game-detail/use-comments.ts`
- **问题**: 21 个导出值，管理状态/获取/排序/分页/上传/拖拽/点赞/回复/删除
- **影响**: 难以测试和维护
- **修复**: 拆分为 `useCommentList`, `useCommentSubmit`, `useCommentUpload`

#### 26. `CommentsSectionProps` 有 22 个 props
- **文件**: `src/components/game-detail/comments-section.tsx`
- **问题**: 纯展示组件，零封装
- **影响**: 组件接口复杂，难以重构
- **修复**: 让组件内部使用 hook，或分组 props 为对象

---

### 🟢 轻微问题（有空可以改）

#### 27. VNDB 客户端代码大量重复
- **文件**: `src/lib/vndb-client.ts` 和 `src/lib/vndb.ts`
- **问题**: 两个文件有 ~900 行重复代码（getRandomStaff、getRandomProducer、getRandomCharacter 等）
- **影响**: 维护困难，修改需同步两处
- **修复**: 提取共享逻辑到 `vndb-shared.ts`

#### 28. `PRESET_COLORS` 重复定义 3 处
- **文件**: `src/lib/tag-colors.ts`、`src/components/tags-manager.tsx`、`src/components/tag-groups-manager.tsx`
- **修复**: 统一使用 `tag-colors.ts` 导出

#### 29. 未使用的变量/导入
- `src/app/api/games/route.ts` — `sort`, `engine` 解构未使用
- `src/app/api/games/[id]/resources/route.ts` — `userIds` 计算未使用
- `src/lib/vndb.ts` — `mapCharacterRole` 方法未调用
- `src/lib/logger.ts` — `export default Logger` 类导出未使用

#### 30. 无操作正则
- **文件**: `src/app/user/[id]/page.tsx`
- **问题**: `replace(/\//g, "/")` 把 `/` 替换成 `/`

#### 31. 重复 CSS 类
- `src/components/game-log-manager.tsx` — `bg-card` 出现两次
- `src/components/music-player.tsx` — `bg-card/95` 重复
- `src/app/notifications/notifications-client.tsx` — `hover:text-red-400 hover:text-red-500` 冲突

#### 32. `safe-avatar.tsx` 的 cache-bust 是无操作
- **文件**: `src/components/safe-avatar.tsx`
- **问题**: `?v=${src}` 相同 URL 产生相同查询参数，不会 bust cache
- **修复**: 使用时间戳或 hash

#### 33. `isGamePublisher` 硬编码为 `false`
- **文件**: `src/components/game-detail/resource-tab.tsx`
- **影响**: 发布者永远无法通过 UI 删除资源

#### 34. 生产代码中的 `console.log`
- `src/app/api/creators/random/route.ts` — 多处带 emoji 的 log
- `src/app/api/characters/random/route.ts` — 同上
- `src/lib/redis.ts` — 冷启动时打印日志
- **修复**: 使用 logger 工具或移除

#### 35. `reactStrictMode: false` 注释误导
- **文件**: `next.config.ts:60`
- **问题**: 注释说"避免生产环境双重渲染"但 Strict Mode 双渲染只在开发环境

#### 36. Git 提交信息不规范
- **问题**: 大量 "优化" 提交信息，无具体描述
- **影响**: 难以追溯变更历史
- **修复**: 使用 Conventional Commits 规范

#### 37. `CLAUDE.md` 引用不存在的 `AGENTS.md`
- **文件**: `CLAUDE.md`
- **问题**: 文件内容仅为 `@AGENTS.md`，但 `AGENTS.md` 不存在

#### 38. `avatar-compose.ts` 使用 `Math.random()`
- **文件**: `src/lib/avatar-compose.ts:93`
- **问题**: 文件名使用 `Math.random()` 生成随机数，有极小概率冲突
- **修复**: 使用 `crypto.randomBytes()`

#### 39. Reports 搜索缺少 `mode: "insensitive"`
- **文件**: `src/app/admin/reports/page.tsx`
- **问题**: 与其他所有搜索不一致，大小写敏感

#### 40. `GameRating.score` 无数据库层范围约束
- **文件**: `prisma/schema.prisma`
- **问题**: 注释写 1-5 但无实际约束
- **修复**: 添加 `@db.SmallInt` 并在应用层验证

---

### 💡 优化建议

#### 1. 重复 API 端点
- `/api/search` 和 `/api/search/suggestions` 可能功能重叠
- `/api/admin/settings` 和 `/api/admin/site-settings` 功能重复
- `/api/admin/vndb`, `/api/admin/vndb/autofill`, `/api/admin/vndb/validate` 功能重叠
- 建议合并或明确职责划分

#### 2. 缺少数据库迁移文件
- 当前只有 `init` 迁移，schema 已经大幅变更但无新迁移文件
- 建议: 定期生成迁移文件，保持 schema 与数据库同步

#### 3. 缺少单元测试
- 当前无测试文件
- 建议: 至少为关键业务逻辑（成就系统、签到、权限检查）添加测试

#### 4. 优化 bundle 大小
- `vndb-tags.ts` 包含大量硬编码翻译词典（~450 行）
- `vndb-constants.ts` 包含 1000 个硬编码的 producer ID
- 建议: 考虑按需加载或移到数据库/配置文件

#### 5. 添加 API 文档
- 项目有 80+ 个 API 路由但无文档
- 建议: 使用 Swagger/OpenAPI 或在代码中添加 JSDoc

#### 6. 考虑使用 React Server Components 更多
- 部分客户端组件可以改为服务端组件减少 bundle
- 建议: 审查 `'use client'` 使用是否必要

#### 7. 数据库连接池配置
- `prisma.ts` 中 `connection_limit=10` 可能不够
- 建议: 根据部署环境调整连接池大小

#### 8. `requireAdmin` 和 `requireSuperAdmin` 重复查询数据库
- **文件**: `src/lib/admin.ts`
- 建议: 提取公共 `getUserRole` 辅助函数

#### 9. Search 页面标签查询无缓存
- 每次加载都查数据库
- 建议: 使用 `unstable_cache`

#### 10. Health Check 修改 Redis 状态
- **文件**: `src/app/api/health/route.ts`
- 建议: 改为只读 `PING` 操作

#### 11. `theme-colors.ts` 的 `"use client"` 指令
- `getThemeCSSVariables` 是纯函数，不需要 client directive
- 建议: 拆分 client/server 函数

#### 12. Collections 页面 N+1 查询
- 每个分组触发独立查询
- 建议: 用单次查询 + 应用层分组

---

## 架构评估

### 优点
1. **清晰的分层**: lib（业务逻辑）→ API routes（接口）→ pages（页面）→ components（组件）
2. **统一的响应格式**: `api-response.ts` 提供了完整的响应工具
3. **可配置系统**: 情感消息、站点设置、文案等都支持后台配置
4. **VNDB 集成**: 完整的视觉小说数据库集成，支持自动填充和标签翻译
5. **安全中间件**: CSP nonce-based、安全头、HSTS、速率限制
6. **缓存策略**: Redis + 内存双后端，自动降级

### 改进点
1. **缺少状态管理**: 复杂页面状态散落在组件中，考虑引入 Zustand
2. **组件过长**: 部分组件（如 `tag-groups-manager.tsx` 超过 1000 行）需要拆分
3. **API 路由过多**: 80+ 个 API 路由，部分可以合并
4. **缺少测试**: 无单元测试、集成测试

---

## 安全评估

### 已实施的安全措施 ✅
- CSP nonce-based（生产环境）
- CSRF 保护（NextAuth 内置）
- 速率限制（Redis + 内存双后端）
- 输入验证（Zod）
- XSS 防护（DOMPurify）
- 安全头（X-Content-Type-Options, X-Frame-Options, Referrer-Policy 等）
- HSTS（生产环境 HTTPS）
- 环境变量验证（启动时检查）
- 管理后台路由保护（middleware.ts）
- SUPER_ADMIN 专属路由隔离

### 待加强 ⚠️
- Stack trace 泄露（creators/random, characters/random）
- 音乐上传权限遗漏 SUPER_ADMIN
- IP 地址明文存储（隐私合规）
- 密码复杂度仅检查长度
- 成就系统性能优化（签到连续天数计算）
- 翻译 API 无 rate limiting（已加认证）

---

## 修复优先级建议

| 优先级 | 问题编号 | 预计工作量 | 说明 |
|--------|---------|-----------|------|
| P0 立即 | #1, #5 | 30 分钟 | 安全漏洞（Stack Trace 泄露、音乐上传权限） |
| P1 本周 | #6, #7, #9, #10, #11 | 1-2 天 | 性能/稳定性/安全 |
| P2 本月 | #12-27 | 3-5 天 | 代码质量/架构 |
| P3 有空 | #28-41, 优化建议 | 持续优化 | 代码整洁度 |

**已修复（本次审计确认）**: #2, #3, #4, #8, #22（原编号）

---

*报告基于对全部 ~150 个源文件的逐一审查（6 个并行代理 + 手动审查），覆盖前台页面、后台管理、API 接口、组件库、数据库配置、安全中间件、缓存策略等*
