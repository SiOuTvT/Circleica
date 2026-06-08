# 代码审计报告（第二次全面审计）

**审计日期**: 2026-06-09
**项目**: Fangame - Galgame/视觉小说社区平台
**技术栈**: Next.js 16 + React 19 + Prisma + PostgreSQL + NextAuth v5 + Tailwind CSS
**代码规模**: 35,355 行 TypeScript/TSX，309 个源文件，91 个 API 路由
**审计方法**: 3 个并行代理读取全部源文件 + ESLint/npm audit/TypeScript 编译检查

---

## 总体评价

**整体评分: 7.5/10**

这是一个功能完整、架构清晰的 Next.js 全栈项目。代码风格统一，安全意识较强（CSP、速率限制、输入验证）。主要问题集中在依赖安全、ESLint 错误、和少量逻辑问题。

**自动化检查结果：**
- ✅ TypeScript 编译：0 错误
- ✅ Prisma Schema 验证：通过
- ⚠️ ESLint：10 个错误，99 个警告
- ⚠️ npm audit：14 个漏洞（7 中等，7 高）

---

## 问题清单

### 🔴 严重问题（必须修复）

#### 1. React Hooks 条件调用
- **文件**: `src/components/gallery-hero.tsx:105-107`
- **问题**: `useRef`、`useState`、`useEffect` 在条件分支中调用，违反 React Hooks 规则
- **影响**: 组件渲染行为不可预测，可能导致状态丢失或崩溃
- **修复**: 将所有 Hooks 移到组件顶层，条件逻辑移到 Hook 内部

#### 2. 渲染时访问 Refs
- **文件**: `src/components/gallery-hero.tsx:174,177`
- **问题**: 在 JSX 渲染期间直接访问 `prevImageRef.current`
- **影响**: React 19 中 refs 在渲染期间不可访问，会导致错误
- **修复**: 使用 `useEffect` 或 `useMemo` 处理 prev/current 图片切换逻辑

#### 3. 依赖包安全漏洞（14 个）
- **问题**: npm audit 报告 14 个漏洞（7 高，7 中）
- **关键漏洞**:
  - `dompurify` 3.4.4: XSS via selectedcontent re-clone
  - `fast-uri`: 路径遍历和主机混淆
  - `next` 9.3.4-16.3.0: 多个安全问题
  - `postcss` <8.5.10: XSS via Unescaped
  - `ip-address`: XSS in Address6
- **影响**: 生产环境存在安全风险
- **修复**: 运行 `npm audit fix`，必要时 `npm audit fix --force`

#### 4. 音乐上传权限检查不完整
- **文件**: `src/lib/uploadthing.ts:39`
- **问题**: `music` 上传中间件只检查 `role !== "ADMIN"`，遗漏了 `SUPER_ADMIN`
- **影响**: SUPER_ADMIN 无法上传音乐
- **修复**: 改为 `if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN")`

#### 5. `calculateCheckinStreak` 加载全部签到记录
- **文件**: `src/lib/achievements.ts:22-27`
- **问题**: `findMany` 无 limit，用户签到数年后会加载数千条记录
- **影响**: 严重性能问题，数据库压力随时间线性增长
- **修复**: 添加 `take: 60`（连续签到不可能超过注册天数）

#### 6. `getUserStats` 每次成就检查执行 8 个独立查询
- **文件**: `src/lib/achievements.ts:77-90`
- **问题**: 虽然用了 `Promise.all`，但每次调用都执行 8 个 COUNT 查询
- **影响**: 成就检查频繁调用时数据库压力大
- **修复**: 缓存用户统计数据（Redis，TTL 5分钟），或合并为单个原始 SQL

#### 7. Stack Trace 可能泄露
- **文件**: `src/app/api/creators/random/route.ts`、`src/app/api/characters/random/route.ts`
- **问题**: catch 块中 `console.error` 可能在开发模式下泄露堆栈
- **影响**: 暴露服务器内部路径
- **修复**: 生产环境只返回通用错误信息

---

### 🟡 中等问题（建议修复）

#### 8. ESLint 错误（10 个）
- **问题**: 10 个 ESLint error 级别问题
- **详情**:
  - `gallery-hero.tsx`: React Hooks 规则违反（5 个）
  - `admin/games/[id]/route.ts`: `creatorConnect` 应用 `const`
  - `admin/games/route.ts`: 同上
  - `admin/achievements/page.tsx`: 未转义的引号字符
  - `page.tsx`: 使用 `<a>` 而非 `<Link>`
- **修复**: 逐一修复 ESLint 错误

#### 9. ESLint 警告（99 个）
- **主要类型**:
  - 46 个未使用变量/导入
  - 40 个使用 `<img>` 而非 `<Image />`
  - 4 个 `any` 类型
  - 其他：missing dependencies、unused state 等
- **修复**: 逐步清理，优先处理未使用变量和 `any` 类型

#### 10. 依赖包版本过旧
- **文件**: `package.json`
- **问题**: `next-auth` 使用 beta 版本 `^5.0.0-beta.31`
- **影响**: 可能有未知漏洞或 breaking changes
- **修复**: 锁定具体版本号或评估升级到稳定版

#### 11. `noImplicitAny` 被关闭
- **文件**: `tsconfig.json:8`
- **问题**: `noImplicitAny: false` 降低了 TypeScript 类型检查严格度
- **影响**: 允许隐式 `any` 类型，削弱类型安全
- **修复**: 逐步修复类型问题后启用

#### 12. Game 模型 JSON 字符串存储
- **文件**: `prisma/schema.prisma:210-216`
- **问题**: `GameResource` 的 `platform`、`language`、`runType`、`resourceContent` 使用 `String` 存储 JSON 数组
- **影响**: 无法查询、无法索引
- **修复**: 改为 Prisma `Json` 类型（`screenshots` 和 `downloadLinks` 已改为 Json）

#### 13. `GameReport` 存储原始 IP 地址
- **文件**: `prisma/schema.prisma:283`
- **问题**: 直接存储原始 IP，无哈希处理
- **影响**: 隐私合规风险
- **修复**: 存储 IP 哈希（`SHA256(ip + salt)`）

#### 14. 管理页面依赖 layout.tsx 权限检查
- **文件**: `/admin/copy`、`/admin/site-settings`、`/admin/avatar-frames` 等
- **问题**: 完全依赖 layout.tsx 的 `SUPER_ADMIN_PATHS` 列表
- **影响**: 列表维护不及时会导致权限泄露
- **修复**: 每个页面添加 `requireSuperAdmin()` 调用

#### 15. 重复 API 端点
- **问题**:
  - `/api/admin/settings` 和 `/api/admin/site-settings` 功能重复
  - `/api/admin/vndb`、`/api/admin/vndb/autofill`、`/api/admin/vndb/validate` 功能重叠
- **修复**: 合并或明确职责划分

#### 16. `storage.ts` 是死代码
- **文件**: `src/lib/storage.ts`
- **问题**: `saveFile()` 和 `deleteFile()` 未被使用
- **修复**: 删除整个文件

#### 17. 内存缓存无 LRU 淘汰
- **文件**: `src/lib/redis.ts`
- **问题**: `MemoryCache` 使用 FIFO 淘汰，非 LRU
- **影响**: 热点数据可能被淘汰
- **修复**: 使用 LRU 策略

#### 18. `rate-limit.ts` 内存存储多实例失效
- **文件**: `src/lib/rate-limit.ts`
- **问题**: serverless 环境中每个实例独立，限流不准确
- **修复**: 文档说明或强制使用 Redis

---

### 🟢 轻微问题（有空可以改）

#### 19. 未使用变量/导入（46 个）
- ESLint 报告 46 个 `no-unused-vars` 警告
- 主要分布在 admin 页面和组件中

#### 20. 使用 `<img>` 而非 `<Image />`（40 个）
- ESLint 报告 40 个 `no-img-element` 警告
- 影响 LCP 性能和带宽

#### 21. 生产代码中的 `console.log`
- 多个文件使用 `console.log` 而非 logger
- 影响日志管理和生产环境输出

#### 22. Git 提交信息不规范
- 大量 "优化" 提交，无具体描述
- 难以追溯变更历史

#### 23. `reactStrictMode: false` 注释误导
- **文件**: `next.config.ts:60`
- 注释说"避免生产环境双重渲染"但 Strict Mode 双渲染只在开发环境

#### 24. `GameRating.score` 无数据库层范围约束
- **文件**: `prisma/schema.prisma:354`
- 注释写 1-5 但无实际约束

#### 25. `avatar-compose.ts` 使用 `Math.random()`
- 文件名生成使用 `Math.random()`，有极小概率冲突
- 应使用 `crypto.randomBytes()`

---

### 💡 优化建议

#### 1. 添加单元测试
- 当前无测试文件
- 建议至少为成就系统、签到、权限检查添加测试

#### 2. 添加 API 文档
- 91 个 API 路由但无文档
- 建议使用 Swagger/OpenAPI

#### 3. 优化 bundle 大小
- `vndb-tags.ts` 包含 ~450 行硬编码翻译
- `vndb-constants.ts` 包含 1000 个硬编码 ID
- 建议按需加载

#### 4. 数据库连接池配置
- `prisma.ts` 中 `connection_limit=10` 可能不够
- 建议根据部署环境调整

#### 5. Search 页面标签查询无缓存
- 每次加载都查数据库
- 建议使用 `unstable_cache`

#### 6. Collections 页面 N+1 查询
- 每个分组触发独立查询
- 建议用单次查询 + 应用层分组

#### 7. Health Check 修改 Redis 状态
- 建议改为只读 `PING` 操作

#### 8. 添加数据库迁移文件
- 当前 schema 已大幅变更但无新迁移文件
- 建议定期生成迁移文件

---

## 架构评估

### 优点
1. **清晰的分层**: lib → API routes → pages → components
2. **统一的响应格式**: `api-response.ts`
3. **可配置系统**: 情感消息、站点设置、文案等
4. **VNDB 集成**: 完整的视觉小说数据库集成
5. **安全中间件**: CSP nonce-based、安全头、HSTS
6. **缓存策略**: Redis + 内存双后端

### 改进点
1. **缺少状态管理**: 复杂页面状态散落在组件中
2. **组件过长**: 部分组件超过 1000 行
3. **缺少测试**: 无单元测试、集成测试
4. **依赖安全**: 14 个漏洞需要修复

---

## 安全评估

### 已实施 ✅
- CSP nonce-based（生产环境）
- CSRF 保护（NextAuth 内置）
- 速率限制（Redis + 内存双后端）
- 输入验证（Zod）
- XSS 防护（DOMPurify）
- 安全头（X-Content-Type-Options, X-Frame-Options 等）
- HSTS（生产环境 HTTPS）
- 环境变量验证
- 管理后台路由保护
- SUPER_ADMIN 专属路由隔离

### 待加强 ⚠️
- 依赖包漏洞（14 个）
- React Hooks 规则违反
- IP 地址明文存储
- 密码复杂度仅检查长度

---

## 修复优先级

| 优先级 | 问题编号 | 预计工作量 | 说明 |
|--------|---------|-----------|------|
| P0 立即 | #1, #2, #3 | 1-2 小时 | React Hooks 错误、依赖漏洞 |
| P1 本周 | #4, #5, #6, #7, #8 | 1-2 天 | 安全/性能/ESLint 错误 |
| P2 本月 | #9-18 | 3-5 天 | 代码质量/架构 |
| P3 有空 | #19-25, 优化建议 | 持续优化 | 代码整洁度 |

---

*报告基于对全部 309 个源文件的审查（3 个并行代理 + ESLint/npm audit/TypeScript 编译检查），覆盖前台页面、后台管理、API 接口、组件库、数据库配置、安全中间件、缓存策略等*
