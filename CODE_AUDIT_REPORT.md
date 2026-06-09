# 代码审计报告（最终版）

**审计日期**: 2026-06-09
**项目**: Fangame - Galgame/视觉小说社区平台
**技术栈**: Next.js 16 + React 19 + Prisma + PostgreSQL + NextAuth v5 + Tailwind CSS
**代码规模**: 35,369 行 TypeScript/TSX，309 个源文件，91 个 API 路由，88 个组件

---

## 总体评价

**整体评分: 9/10**

经过三轮全面审计和修复，项目代码质量显著提升。自动化检查全部通过，无 ESLint 错误或警告，TypeScript 编译零错误，构建成功。

**自动化检查结果：**
- ✅ TypeScript 编译：0 错误
- ✅ ESLint：0 错误，0 警告
- ✅ Prisma Schema 验证：通过
- ✅ Next.js Build：成功
- ⚠️ npm audit：2 个中等漏洞（next.js 依赖的 postcss，实际无风险）

---

## 问题清单

### 🔴 严重问题（必须修复）

**无。** 所有严重问题已在前两轮审计中修复。

---

### 🟡 中等问题（建议修复）

#### 1. 游戏简介 dangerouslySetInnerHTML 未净化
- **文件**: `src/components/game-detail-client.tsx:236`
- **问题**: `allDescriptions` 中的 `d.text` 直接通过 `dangerouslySetInnerHTML` 渲染，未使用 DOMPurify 净化
- **影响**: 存储型 XSS — 管理员在游戏简介中注入恶意 HTML 会渲染给所有用户
- **修复**: 使用 `DOMPurify.sanitize(d.text)` 净化后再渲染

#### 2. npm audit 2 个中等漏洞
- **问题**: next.js 16.2.7 依赖 postcss 8.4.31（XSS via Unescaped `</style>`）
- **影响**: 实际无风险 — 项目中 CSS 都是 Tailwind 自动生成，用户无法注入 CSS
- **修复**: 等 next.js 升级后自动修复，可安全忽略

#### 3. GameResource 使用 JSON 字符串存储
- **文件**: `prisma/schema.prisma:210-216`
- **问题**: `platform`、`language`、`runType`、`resourceContent` 使用 `String` 存储 JSON 数组
- **影响**: 无法查询、无法索引
- **修复**: 改为 Prisma `Json` 类型（`screenshots` 和 `downloadLinks` 已改为 Json）

#### 4. `next-auth` 使用 Beta 版本
- **文件**: `package.json:34`
- **问题**: `5.0.0-beta.31` 不是稳定版
- **影响**: 可能有未知漏洞或 breaking changes
- **修复**: 锁定具体版本号或评估升级

---

### 🟢 轻微问题（有空可以改）

#### 5. 部分组件使用 eslint-disable 注释
- 12 个 `@typescript-eslint/no-explicit-any` 注释
- 12 个 `@next/next/no-img-element` 注释
- 这些都是合理使用（undici dispatcher、blob URL 预览等）

#### 6. `Math.random()` 用于文件名生成
- **文件**: `src/app/api/games/[id]/comments/route.ts:59`
- **问题**: 使用 `Math.random()` 生成文件名，非加密安全
- **影响**: 极小概率文件名冲突
- **修复**: 改用 `crypto.randomBytes()`

#### 7. `noImplicitAny` 仍关闭
- **文件**: `tsconfig.json:8`
- **问题**: 允许隐式 `any` 类型
- **修复**: 逐步修复后启用

#### 8. 无单元测试
- 当前无测试文件
- 建议至少为关键业务逻辑添加测试

---

### 💡 优化建议

#### 1. 添加 API 文档
- 91 个 API 路由但无文档

#### 2. 优化 bundle 大小
- `vndb-tags.ts` 包含 ~450 行硬编码翻译
- `vndb-constants.ts` 包含 1000 个硬编码 ID

#### 3. Search 页面标签查询无缓存
- 每次加载都查数据库

#### 4. Collections 页面 N+1 查询
- 每个分组触发独立查询

---

## 安全评估

### 已实施 ✅
- CSP nonce-based（生产环境）
- CSRF 保护（NextAuth 内置）
- 速率限制（Redis + 内存双后端，LRU 淘汰）
- 输入验证（Zod）
- XSS 防护（DOMPurify — 大部分组件已使用）
- 安全头（X-Content-Type-Options, X-Frame-Options 等）
- HSTS（生产环境 HTTPS）
- 环境变量验证
- 管理后台路由保护（middleware.ts + 每个 API 权限检查）
- SUPER_ADMIN 专属路由隔离
- IP 哈希存储（GameReport）
- Stack trace 不暴露（仅开发环境）
- 成就系统字段白名单（UPDATABLE_FIELDS）
- 站点配置键名白名单（ALLOWED_KEYS）

### 待加强 ⚠️
- 游戏简介 dangerouslySetInnerHTML 未净化（#1）

---

## 修复记录（三轮审计）

| 轮次 | 修复数量 | 主要内容 |
|------|---------|---------|
| 第一轮 | 33 | 安全漏洞、性能优化、代码质量 |
| 第二轮 | 15 | React Hooks、ESLint 错误、依赖漏洞 |
| 第三轮 | 51 | 未使用变量、console.log、`<img>` 转换 |
| **总计** | **99** | **涉及 100+ 个文件** |

---

## 架构评估

### 优点
1. **清晰的分层**: lib → API routes → pages → components
2. **统一的响应格式**: `api-response.ts`
3. **可配置系统**: 情感消息、站点设置、文案等
4. **VNDB 集成**: 完整的视觉小说数据库集成
5. **安全中间件**: CSP nonce-based、安全头、HSTS
6. **缓存策略**: Redis + 内存双后端（LRU 淘汰）
7. **VNDB 代码去重**: 共享逻辑提取到 `vndb-shared.ts`

### 改进点
1. **缺少测试**: 无单元测试、集成测试
2. **部分组件过长**: 如 `tag-groups-manager.tsx`

---

*报告基于对全部 309 个源文件的审查，包括 TypeScript 编译、ESLint 检查、npm audit、Prisma Schema 验证、Next.js 构建验证*
