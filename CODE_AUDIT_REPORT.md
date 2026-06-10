# 🔍 同人游戏站 — 全栈代码审计报告

> 审计日期：2026-06-10  
> 审计范围：全项目源码（src/、prisma/、配置文件）  
> 技术栈：Next.js 16 + React 19 + Prisma + PostgreSQL + NextAuth v5

---

## 📊 总体评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码质量 | ⭐⭐⭐⭐ 4/5 | TypeScript 严格模式，类型定义完整，命名规范 |
| 安全性 | ⭐⭐⭐⭐ 4/5 | 多层防护到位，个别细节可优化 |
| 性能优化 | ⭐⭐⭐⭐ 4/5 | ISR、Redis 缓存、动态导入等策略合理 |
| 架构设计 | ⭐⭐⭐⭐½ 4.5/5 | 分层清晰，关注点分离良好 |
| 可维护性 | ⭐⭐⭐⭐ 4/5 | 模块化程度高，注释充分 |
| **综合** | **⭐⭐⭐⭐ 4.1/5** | **整体质量优秀的中大型全栈项目** |

---

## 🏗️ 一、架构设计

### ✅ 亮点

1. **分层架构清晰**
   - `src/lib/` — 工具库层（数据库、缓存、验证、日志等）
   - `src/app/api/` — API 路由层（RESTful 风格）
   - `src/components/` — UI 组件层
   - `src/hooks/` — 自定义 Hook 层
   - `src/types/` — 类型定义层

2. **统一的 API 响应格式** (`src/lib/api-response.ts`)
   ```typescript
   // 所有 API 使用统一的成功/错误响应格式
   success(), created(), badRequest(), unauthorized(), forbidden(), conflict(), serverError()
   ```

3. **中间件模式优雅** — `withRateLimit()` 高阶函数包装 API 路由
   ```typescript
   export const POST = (req: NextRequest) =>
     withRateLimit(handleRegister, rateLimits.register, "register")(req)
   ```

4. **环境变量验证** (`src/lib/env.ts`) — 启动时用 Zod 验证所有环境变量，生产环境缺失必需变量直接 `process.exit(1)`

5. **功能降级策略** — Redis 未配置时自动降级为内存缓存，Sentry 未配置时跳过监控

### ⚠️ 建议

1. **缺少全局错误边界** — `error-boundary.tsx` 存在但未见在 layout 中全局包裹
2. **API 路由缺少统一的请求日志中间件** — 每个路由单独调用 `logger`，建议提取为中间件
3. **部分 API 路由缺少 `withAdminAuth` 包装** — 管理后台路由直接在 handler 内部检查权限，建议统一使用中间件

---

## 🔒 二、安全性审计

### ✅ 已实施的安全措施（优秀）

| 措施 | 实现位置 | 评价 |
|------|----------|------|
| 密码哈希 | `bcrypt.hash(password, 10)` | ✅ 正确 |
| CSRF 防护 | NextAuth 内置 + `sameSite: "lax"` | ✅ 正确 |
| XSS 防护 | DOMPurify + CSP 头 + `sanitize.ts` | ✅ 多层防护 |
| SQL 注入 | Prisma ORM 参数化查询 | ✅ 自动防护 |
| 速率限制 | `rate-limit.ts` + `middleware.ts` | ✅ Redis/内存双后端 |
| 输入验证 | Zod schema (`validations/index.ts`) | ✅ 全面 |
| Cookie 安全 | `httpOnly` + `secure`(生产) + `sameSite` | ✅ 正确 |
| CSP 头 | `Content-Security-Policy` in next.config.ts | ✅ 严格模式 |
| 安全响应头 | X-Frame-Options, X-Content-Type-Options 等 | ✅ 完整 |
| 路径遍历防护 | `sanitizeFilename()` + `..` 检测 | ✅ 正确 |
| 文件上传验证 | 类型检查 + 大小限制 + 哈希重命名 | ✅ 全面 |

### ⚠️ 安全问题与建议

#### 🔴 高优先级

**1. 注册接口首次用户自动提权逻辑**
```typescript
// src/app/api/auth/register/route.ts:32-33
const userCount = await prisma.user.count()
const role = userCount === 0 ? "SUPER_ADMIN" : "USER"
```
- **风险**：存在竞态条件（Race Condition）。两个并发请求可能同时发现 `userCount === 0`，导致两个 SUPER_ADMIN
- **建议**：使用数据库事务 + 唯一约束，或在数据库层面通过种子脚本创建首个管理员

**2. ~~`img-src` CSP 包含 `https://*`~~ ✅ 已修复**
```typescript
// src/middleware.ts — 已替换为明确的域名白名单
const imgDomains = [
  "'self'", "data:", "blob:",
  "*.r2.dev", "*.r2.cloudflarestorage.com",  // Cloudflare R2
  "utfs.io", "uploadthing.com",               // UploadThing
  "static.vndb.org", "t.vndb.org",            // VNDB
  "*.gravatar.com", "cdn.libravatar.org",     // 头像源
  // + R2_PUBLIC_URL 自定义域名（如有）
  // + 开发环境 localhost
]
`img-src ${imgDomains.join(" ")}`
```
- **状态**：已修复，仅允许已知图片域名

#### 🟡 中优先级

**3. ~~`sanitizeString()` 可被绕过~~ ✅ 已修复**
```typescript
// src/lib/sanitize.ts — 已改用 DOMPurify 替代正则替换
export function sanitizeString(input: string): string {
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
  return cleaned.trim()
}
```
- **状态**：已修复，使用 DOMPurify 确保所有 HTML 标签和危险内容被可靠清除

**4. ~~`isomorphic-dompurify` 客户端包体积~~ ✅ 已修复**
```typescript
// next.config.ts — 客户端构建时将 isomorphic-dompurify 别名为轻量 dompurify
webpack(config, { isServer }) {
  if (!isServer) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "isomorphic-dompurify": "dompurify",
    }
  }
  return config
}
```
- **状态**：已修复，客户端使用原生 `dompurify`（~10KB）替代 `isomorphic-dompurify`（~500KB 含 jsdom）
- 服务端仍使用 `isomorphic-dompurify`，所有现有 `import` 语句无需修改

**5. 管理员删除用户未清理关联数据的软删除策略**
- `DELETE /api/admin/users` 直接硬删除用户，但 Prisma cascade 会删除关联数据
- 建议：考虑软删除策略以保留审计日志

#### 🟢 低优先级

6. **JWT session 策略** — 默认 30 天过期时间较长，建议根据安全需求调整
7. **OAuth State 参数** — 已正确使用 `crypto.randomUUID()` 生成
8. **Turnstile 验证码** — 注册/登录/评论已集成 Cloudflare Turnstile

---

## ⚡ 三、性能审计

### ✅ 已实施的性能优化

| 优化 | 实现 | 效果 |
|------|------|------|
| ISR 增量静态再生成 | `revalidate = 60/300` | 减少数据库查询 |
| Redis 缓存 | `src/lib/redis.ts` | 热数据内存读取 |
| 图片优化 | `Next/Image` + Cloudflare Image Resizing | WebP/AVIF 自动转换 |
| 动态导入 | `next/dynamic` + `ssr: false` | 减少首屏 JS |
| 首屏限制 | `revalidateFirstOnly: true` | 仅首次请求阻塞 |
| 连接池 | Prisma `connection_limit=10` | 避免连接耗尽 |
| 分页查询 | `skip/take` + `Promise.all` | 并行查询优化 |

### ⚠️ 性能问题与建议

#### 🟡 中优先级

**1. ~~首页服务器组件数据库查询过多~~ ✅ 已修复**
```typescript
// src/app/page.tsx — 统计数据已缓存到 Redis（TTL 5 分钟）
const cached = await cache.get(statsCacheKey)
if (cached) { /* 命中缓存，跳过数据库查询 */ }
else { /* 查询数据库并缓存结果 */ }
```
- **状态**：已修复，统计查询（total、todayCheckins、weekNewGames、announcements）通过 Redis/内存缓存，5 分钟 TTL

**2. 游戏详情页 N+1 查询风险**
```typescript
// src/app/games/[id]/page.tsx
const relatedGames = await prisma.game.findMany({
  where: { tags: { some: { tag: { name: { in: tagNames } } } } },
})
```
- 当标签数量多时，查询可能较慢
- 建议：限制 `tagNames` 数量或使用 Redis 缓存相关游戏

**3. ~~`isomorphic-dompurify` 客户端引入~~ ✅ 已修复**
- **状态**：已修复，通过 webpack alias 客户端自动使用轻量 `dompurify`（~10KB），详见中优先级 #4

**4. Prisma 客户端单例**
```typescript
// src/lib/prisma.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
```
- ✅ 开发环境正确使用全局单例避免热重载连接泄漏
- 但生产环境每次冷启动都会创建新实例（这是正常的）

#### 🟢 低优先级

5. **字体加载** — 使用 Google Fonts CDN，建议考虑自托管以减少外部依赖
6. **CSS 变量主题系统** — 已实现 CSS 变量切换，性能良好
7. **Next.js Bundle Analyzer** — 建议定期运行以监控包体积

---

## 🧹 四、代码质量

### ✅ 亮点

1. **TypeScript 严格模式** — `strict: true`，类型安全有保障
2. **Zod 验证全覆盖** — 所有 API 输入都有 schema 验证
3. **统一日志系统** — `src/lib/logger.ts` 提供分类日志器
4. **Prisma Schema 设计** — 关系定义完整，索引合理
5. **ESLint + Prettier** — 代码风格统一
6. **Jest 测试配置** — 已配置但测试覆盖率未知

### ⚠️ 问题与建议

#### 🟡 中优先级

**1. 部分 `any` 类型使用**
- `src/lib/validations/index.ts` 中 `formatZodError` 使用 `ZodError | any`
- 建议：使用 `unknown` 替代 `any`

**2. 错误处理不一致**
- 部分 API 路由 catch 块返回中文错误信息，部分返回英文
- 建议：统一错误消息语言和格式

**3. 组件过大**
- `game-detail-client.tsx` 约 494 行，`game-form.tsx` 可能更大
- 建议：拆分为更小的子组件

**4. 测试覆盖不足**
- `jest.config.ts` 和 `jest.setup.ts` 存在，但未见大量测试文件
- 建议：至少覆盖核心 API 路由和关键业务逻辑

#### 🟢 低优先级

5. **注释语言混杂** — 中英文注释混用，建议统一
6. **Magic Numbers** — 部分硬编码数字（如 `take: 20`、`maxSize: 10 * 1024 * 1024`）建议提取为常量
7. **TODO/FIXME** — 建议定期清理

---

## 📁 五、项目结构

### ✅ 优点

```
src/
├── app/                    # ✅ App Router 页面组织清晰
│   ├── api/               # ✅ API 路由按资源分目录
│   ├── admin/             # ✅ 管理后台独立目录
│   ├── games/             # ✅ 动态路由 + 嵌套页面
│   └── forum/             # ✅ 论坛模块独立
├── components/            # ✅ 组件按功能命名
│   ├── game-detail/       # ✅ 复杂组件拆分子目录
│   └── ui/               # ✅ shadcn/ui 基础组件
├── hooks/                 # ✅ 自定义 Hook 独立目录
├── lib/                   # ✅ 工具库模块化
│   ├── validations/       # ✅ Zod schema 独立目录
│   └── ...
├── types/                 # ✅ 类型定义集中管理
```

### ⚠️ 建议

1. **组件目录过于扁平** — `src/components/` 下 70+ 文件，建议按功能进一步分组
2. **缺少 `constants/` 目录** — 魔法数字和配置值应集中管理
3. **缺少 `errors/` 目录** — 自定义错误类应集中定义

---

## 🔧 六、可维护性

### ✅ 优点

- **模块化工具库** — `rate-limit.ts`、`api-response.ts`、`sanitize.ts` 等职责单一
- **Prisma Schema 清晰** — 数据模型关系明确
- **配置外部化** — 环境变量、站点设置均可配置
- **国际化准备** — 支持 VNDB 多语言描述、翻译按钮

### ⚠️ 建议

1. **缺少 CONTRIBUTING.md** — 新开发者入门指南
2. **缺少 API 文档** — 建议使用 OpenAPI/Swagger 自动生成
3. **数据库迁移管理** — 已有 `prisma/migrations/`，建议加强迁移审查流程

---

## 📋 七、优先级修复清单

### 🔴 高优先级（建议立即修复）

| # | 问题 | 文件 | 影响 | 状态 |
|---|------|------|------|------|
| 1 | 注册竞态条件 | `api/auth/register/route.ts` | 可能创建多个超管 | ⚪ 用户已确认为设计意图 |
| 2 | CSP img-src 过于宽松 | `src/middleware.ts` | XSS 防护削弱 | ✅ 已修复 |

### 🟡 中优先级（建议近期修复）

| # | 问题 | 文件 | 影响 | 状态 |
|---|------|------|------|------|
| 3 | `sanitizeString` 可被绕过 | `lib/sanitize.ts` | 潜在 XSS | ✅ 已修复 |
| 4 | 首页查询过多 | `app/page.tsx` | 首页加载慢 | ✅ 已修复 |
| 5 | DOMPurify 客户端体积 | 多个组件 | 包体积增大 | ✅ 已修复 |
| 6 | 组件过大需拆分 | `game-detail-client.tsx` | 可维护性 | ⚪ 待处理 |
| 7 | 测试覆盖不足 | 全局 | 回归风险 | ⚪ 待处理 |
| 8 | `any` 类型使用 | `lib/validations/` | 类型安全 | ⚪ 待处理 |

### 🟢 低优先性（建议长期改进）

| # | 问题 | 影响 |
|---|------|------|
| 9 | 自托管字体 | 减少外部依赖 |
| 10 | 组件目录重组 | 可维护性 |
| 11 | API 文档自动生成 | 开发效率 |
| 12 | 错误消息统一 | 用户体验 |
| 13 | Magic Numbers 提取 | 代码可读性 |

---

## 🎯 八、总结

这是一个**架构设计良好、安全性较高的中大型全栈项目**。核心优势在于：

- 🔐 **安全防护全面** — 从输入验证到输出清理，从速率限制到 CSP 头，形成了多层防御
- ⚡ **性能优化到位** — ISR + Redis 缓存 + 图片优化 + 动态导入的组合策略
- 🏗️ **架构分层清晰** — 关注点分离良好，模块职责单一
- 📝 **TypeScript 严格模式** — 类型安全有保障

主要改进方向：

1. 修复注册竞态条件和 CSP 配置
2. 增加测试覆盖率
3. 优化大组件拆分
4. 统一错误处理和日志策略

**总体而言，该项目代码质量处于中上水平，适合投入生产使用。**