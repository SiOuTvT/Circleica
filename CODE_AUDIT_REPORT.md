# 代码审计报告

**审计日期**: 2026-06-08
**审计范围**: 全项目（前台、后台、API、组件、配置、数据库）

---

## 总体评价

**代码质量评分: 6.5/10**

项目功能完整，业务逻辑基本正确，但存在以下系统性问题：
1. **安全防护不足** — 多个 API 缺少输入验证和 rate limiting
2. **代码重复严重** — VNDB 客户端、颜色常量、工具函数大量重复
3. **类型安全薄弱** — 多处 `any` 类型，`noImplicitAny` 被关闭
4. **错误处理不一致** — 部分 API 无 try/catch，部分静默吞错

---

## 问题清单

### 🔴 严重问题（必须修复）

**1. Stack Trace 泄露**
- 文件: `src/app/api/creators/random/route.ts:67`, `src/app/api/characters/random/route.ts:49`
- 问题: `error.stack` 直接返回给客户端
- 影响: 暴露服务器内部路径和库版本
- 修复: 移除 `details: error.stack`，只返回通用错误信息

**2. `.env` 包含弱密码**
- 文件: `.env:1-2`
- 问题: 数据库密码 `fangame2024`，NEXTSECRET 可猜测
- 影响: 生产环境安全风险
- 修复: 生产环境必须使用强随机密码

**3. `/api/admin/settings` 无键名白名单**
- 文件: `src/app/api/admin/settings/route.ts:24-32`
- 问题: 接受任意 key-value 写入 siteSetting 表
- 影响: 管理员可注入任意设置
- 修复: 添加允许的键名白名单

**4. `/api/admin/achievements/[id]` PUT 直接传 body 给 Prisma**
- 文件: `src/app/api/admin/achievements/[id]/route.ts:14`
- 问题: `data: body` 未过滤字段，mass assignment 漏洞
- 影响: 可覆盖任意字段（如 id, createdAt）
- 修复: 解构并只允许特定字段

**5. 权限不一致 — emotional-messages `[id]` 路由**
- 文件: `src/app/api/admin/emotional-messages/[id]/route.ts:7,31`
- 问题: 使用 `requireAdmin()` 但页面要求 SUPER_ADMIN
- 影响: 普通 ADMIN 可通过 API 编辑/删除情感消息
- 修复: 改用 `getAdminSession("SUPER_ADMIN")`

**6. ReportResolveBtn 逻辑 Bug**
- 文件: `src/app/admin/reports/resolve-btn.tsx:13-19`
- 问题: 注释说"删除该游戏所有举报"，但代码只删除单条。`gameId` prop 未使用
- 影响: 解决举报只删一条，其他举报残留
- 修复: 改为按 `gameId` 删除所有相关举报

**7. CSP 允许 `unsafe-inline` 脚本**
- 文件: `src/middleware.ts:9`
- 问题: `script-src 'self' 'unsafe-inline'` 使 XSS 防护失效
- 影响: 攻击者可注入内联脚本
- 修复: 迁移到 nonce-based CSP

**8. `next-auth` 使用 Beta 版本**
- 文件: `package.json:35`
- 问题: `^5.0.0-beta.31` 不是稳定版
- 影响: 认证系统可能有未知漏洞
- 修复: 评估是否回退到稳定版 v4

**9. 多个 API 无 `req.json()` 错误处理**
- 文件: `forgot-password`, `reset-password`, `profile/edit`, `translate`, `rating`, `play-status`, `notifications` 等路由
- 问题: 畸形 JSON 请求体导致未处理的 500 错误
- 影响: 服务器错误信息可能泄露
- 修复: 包裹 try/catch

**10. `/api/translate` 公开端点无认证无限流**
- 文件: `src/app/api/translate/route.ts:46-73`
- 问题: 任何人都可调用，可被滥用为开放代理
- 影响: 耗尽上游 API 配额
- 修复: 添加认证或 rate limiting

---

### 🟡 中等问题（建议修复）

**11. 缺少数据库索引**
- `Account.userId` (schema:93) — 无独立索引
- `Session.userId` (schema:99) — 无独立索引
- `PlayStatus.gameId` (schema:269) — 复合索引不覆盖单独查询
- `GameRating.userId` (schema:351) — 无索引
- `Game.publisherId` (schema:125) — 无索引

**12. 冗余索引**
- `User.serialId` (schema:50) — `@unique` 已隐含索引
- `Game` 有两个重叠复合索引 (schema:139-140)

**13. `User.role` 是自由字符串而非枚举**
- 文件: `prisma/schema.prisma:23`
- 问题: 拼写错误（如 `"ADMN"`）会静默失效
- 修复: 改用 Prisma enum

**14. `CheckIn.date` 存为 String 而非 DateTime**
- 文件: `prisma/schema.prisma:370`
- 影响: 无法使用数据库原生日期查询

**15. `GameRating.score` 无数据库层范围约束**
- 文件: `prisma/schema.prisma:346`
- 问题: 注释写 1-5 但无实际约束

**16. VNDB 客户端代码大量重复**
- `src/lib/vndb-client.ts` 和 `src/lib/vndb.ts` 有 ~900 行重复代码
- 包括 `knownIds` 数组、`searchTerms`、`getRandomStaff`/`getRandomProducer`/`getRandomCharacter` 等

**17. `PRESET_COLORS` 重复定义 3 处**
- `src/lib/tag-colors.ts`
- `src/components/tags-manager.tsx:22`
- `src/components/tag-groups-manager.tsx:34-39`

**18. `formatRelativeTime` 重复实现**
- `src/lib/time-ago.ts`
- `src/components/game-detail/resource-tab.tsx:10-27`

**19. `use-comments.ts` 是 God Hook**
- 文件: `src/components/game-detail/use-comments.ts`
- 问题: 21 个导出值，管理状态/获取/排序/分页/上传/拖拽/点赞/回复/删除
- 修复: 拆分为 `useCommentList`, `useCommentSubmit`, `useCommentUpload`

**20. `CommentsSectionProps` 有 22 个 props**
- 文件: `src/components/game-detail/comments-section.tsx`
- 问题: 纯展示组件，零封装
- 修复: 让组件内部使用 hook，或分组 props

**21. `tag-groups-manager.tsx` 超过 1000 行**
- 问题: 包含 4 个子组件，应拆分

**22. `x-forwarded-for` 头可伪造**
- 文件: `src/app/api/games/[id]/view/route.ts:14`, `src/app/api/games/[id]/report/route.ts:9`
- 影响: 可绕过基于 IP 的限流/去重

**23. Sentry Tunnel DSN 验证太松**
- 文件: `src/app/api/sentry/tunnel/route.ts:13`
- 问题: `.endsWith("sentry.io")` 可匹配 `evil-sentry.io`
- 修复: 改为 `.endsWith(".sentry.io")`

**24. 多个管理页面无自身权限检查**
- `/admin/copy`, `/admin/site-settings`, `/admin/avatar-frames`, `/admin/achievements`, `/admin/theme`, `/admin/resource-tags`
- 问题: 完全依赖 layout.tsx 的 `SUPER_ADMIN_PATHS` 列表
- 影响: 列表维护不及时会导致权限泄露

**25. Reports 搜索缺少 `mode: "insensitive"`**
- 文件: `src/app/admin/reports/page.tsx:37`
- 问题: 与其他所有搜索不一致，大小写敏感

**26. `favorites` 页面用 `id: "desc"` 排序而非 `createdAt`**
- 文件: `src/app/admin/favorites/page.tsx:35`

**27. `translate-x-5.5` 可能不是有效 Tailwind 类**
- 文件: `src/app/admin/site-settings/page.tsx:171`
- 影响: 开关组件可能渲染异常

---

### 🟢 轻微问题（有空可以改）

**28. 未使用的变量/导入**
- `src/app/page.tsx` — 已清理
- `src/app/api/games/route.ts:26` — `sort`, `engine` 解构未使用
- `src/app/api/games/[id]/resources/route.ts:23` — `userIds` 计算未使用
- `src/app/user/[id]/page.tsx:95-96` — `favGames` 和 `allFavGames` 重复
- `src/lib/vndb.ts:857` — `mapCharacterRole` 方法未调用
- `src/lib/logger.ts:60` — `export default Logger` 类导出未使用

**29. 无操作正则**
- `src/app/user/[id]/page.tsx:118` — `replace(/\//g, "/")` 把 `/` 替换成 `/`

**30. 重复 CSS 类**
- `src/components/game-log-manager.tsx:46` — `bg-card` 出现两次
- `src/components/game-log-manager.tsx:61` — `bg-secondary/60/60` 双重 opacity
- `src/components/music-player.tsx:77-79` — `bg-card/95` 重复
- `src/app/notifications/notifications-client.tsx:419` — `hover:text-red-400 hover:text-red-500` 冲突

**31. `escapeHtml` 双重转义风险**
- `src/app/api/forum/posts/route.ts:72-73`
- 问题: 存储时转义，渲染时 React 再次转义，可能显示 `&amp;amp;`

**32. `safe-avatar.tsx` 的 cache-bust 是无操作**
- 文件: `src/components/safe-avatar.tsx:57`
- 问题: `?v=${src}` 相同 URL 产生相同查询参数，不会 bust cache

**33. `isGamePublisher` 硬编码为 `false`**
- 文件: `src/components/game-detail/resource-tab.tsx:473`
- 影响: 发布者永远无法通过 UI 删除资源

**34. 生产代码中的 `console.log`**
- `src/app/api/creators/random/route.ts` — 多处带 emoji 的 log
- `src/app/api/characters/random/route.ts` — 同上
- `src/lib/redis.ts:196-207` — 冷启动时打印日志

**35. `reactStrictMode: false` 注释误导**
- 文件: `next.config.ts:60`
- 问题: 注释说"避免生产环境双重渲染"但 Strict Mode 双渲染只在开发环境

**36. `noImplicitAny: false` 与 `strict: true` 矛盾**
- 文件: `tsconfig.json:7-8`
- 影响: 削弱 TypeScript 类型安全

---

### 💡 优化建议

**37. API 响应格式统一**
- 约一半端点用 `{ success, data }` 格式，另一半用 `{ error }` 格式
- 建议统一使用 `src/lib/api-response.ts` 的工具函数

**38. 重复 API 端点**
- `/api/search` 和 `/api/search/suggestions` 完全相同
- `/api/announcements` 和 `/api/admin/announcements` GET 相同
- `/api/admin/settings` 和 `/api/admin/site-settings` 功能重复
- `/api/admin/vndb`, `/api/admin/vndb/autofill`, `/api/admin/vndb/validate` 功能重叠

**39. 缺少全局 Rate Limiting**
- 登录、注册、评论、点赞、关注等端点均无限流
- 内存级限流器在多实例部署下无效
- 建议使用 Redis-based 限流

**40. 文件上传限制**
- `src/app/api/upload/route.ts` 和 `src/app/api/games/[id]/comments/route.ts` 保存到 `public/uploads/`
- Serverless 环境下不可用
- 建议迁移到对象存储（已有 R2 配置）

**41. Collections 页面 N+1 查询**
- `src/app/collections/page.tsx:22-32`
- 每个 `originalWork` 分组触发独立查询
- 建议用单次查询 + 应用层分组

**42. Search 页面标签查询无缓存**
- `src/app/search/page.tsx:214-218`
- 每次加载都查数据库，建议用 `unstable_cache`

**43. Health Check 修改 Redis 状态**
- `src/app/api/health/route.ts:37-38`
- 建议改为只读 `PING` 操作

**44. `theme-colors.ts` 的 `"use client"` 指令**
- 文件: `src/lib/theme-colors.ts:1`
- `getThemeCSSVariables` 是纯函数，不需要 client directive
- 建议拆分 client/server 函数

**45. `requireAdmin` 和 `requireSuperAdmin` 重复查询数据库**
- 文件: `src/lib/admin.ts:20-43`
- 建议提取公共 `getUserRole` 辅助函数

---

## 修复优先级建议

| 优先级 | 问题编号 | 预计工作量 |
|--------|---------|-----------|
| P0 立即 | #1, #2, #3, #4, #5, #6 | 2-3 小时 |
| P1 本周 | #7, #9, #10, #11, #16, #22, #23 | 1-2 天 |
| P2 本月 | #8, #13, #14, #17-21, #24-27 | 3-5 天 |
| P3 有空 | #28-36, #37-45 | 持续优化 |

---

*报告由 5 个并行审计代理生成，覆盖前台页面、后台管理、API 接口、组件库、数据库配置*
