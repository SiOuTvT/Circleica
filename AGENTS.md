# Fangame - Galgame/视觉小说社区平台

## 项目概述
Next.js 16 全栈应用，为 Galgame/视觉小说爱好者提供社区平台。

## 技术栈
- **前端**: React 19, Tailwind CSS, shadcn/ui, TipTap 富文本编辑器
- **后端**: Next.js App Router, Prisma ORM, PostgreSQL
- **认证**: NextAuth v5 (Credentials + JWT)
- **存储**: Local / Cloudflare R2 (统一 Storage Adapter)
- **缓存**: Upstash Redis (可选，自动降级为内存缓存)
- **监控**: Sentry
- **API**: VNDB (视觉小说数据库)

## 项目结构
```
src/
├── app/                    # Next.js App Router 页面
│   ├── admin/             # 管理后台页面
│   ├── api/               # API 路由（Route 层，仅做请求解析 + 调用 Service）
│   │   ├── admin/         # 管理员 API
│   │   ├── auth/          # 认证 API
│   │   ├── forum/         # 论坛 API
│   │   └── games/         # 游戏 API
│   ├── games/             # 游戏详情页
│   ├── forum/             # 论坛页面
│   └── profile/           # 用户中心
├── components/            # React 组件
│   ├── game-detail/       # 游戏详情相关组件
│   └── ui/                # 基础 UI 组件 (shadcn)
├── hooks/                 # 自定义 React Hooks
├── lib/                   # 工具库
│   ├── api-handler.ts     # 统一 API Route Handler 包装（错误处理 + 响应格式）
│   ├── api-response.ts    # 旧版 API 响应格式（逐步迁移到 api-handler）
│   ├── auth.ts            # NextAuth 配置
│   ├── auth-context.ts    # API 路由认证上下文（requireAuth / requireAdminRole）
│   ├── config.ts          # 全局业务常量（缓存 TTL、分页、限制等）
│   ├── env.ts             # 环境变量懒验证（build 安全）
│   ├── errors.ts          # 统一业务异常类
│   ├── logger.ts          # 结构化日志（开发彩色/生产 JSON）
│   ├── prisma.ts          # Prisma 客户端单例
│   ├── queue.ts           # 队列适配器接口（预留）
│   ├── redis.ts           # Redis/内存缓存
│   ├── rate-limit.ts      # 速率限制
│   ├── r2.ts              # @deprecated - 使用 storage.ts
│   ├── site-settings.ts   # 站点配置服务（三层缓存）
│   ├── storage.ts         # 统一存储适配器（Local / R2）
│   └── vndb.ts            # VNDB API 客户端
├── repositories/          # Repository 层（纯数据访问）
│   └── announcement.ts    # 公告数据访问
├── services/              # Service 层（业务逻辑）
│   └── announcement.ts    # 公告业务逻辑
└── types/                 # TypeScript 类型定义
```

## API 三层架构

```
Route (src/app/api/**/route.ts)
  ↓ 解析请求、调用 Service、返回响应
  ↓ 使用 withHandler() 包装，自动处理异常
Service (src/services/**)
  ↓ 业务逻辑、输入校验、权限检查
  ↓ 抛出 AppError 子类（NotFoundError / ValidationError / ForbiddenError 等）
Repository (src/repositories/**)
  ↓ 纯 Prisma 数据访问，无业务逻辑
```

## 开发规范
- 使用 TypeScript 严格模式
- **API 路由** 使用 `withHandler()` 包装，禁止裸 try-catch
- **认证** 使用 `requireAuth()` / `requireAdminRole()` 从 `@/lib/auth-context`
- **错误** 抛出 `AppError` 子类，handler 自动转为标准响应
- **配置** 业务常量放 `@/lib/config.ts`，环境变量放 `@/lib/env.ts`
- **日志** 使用 `@/lib/logger`，禁止 `console.log`
- **存储** 使用 `getStorage()` 统一接口，不直接调用 R2/本地
- 输入验证使用 Zod schema (定义在 `@/lib/validations`)
- 数据库操作通过 Repository 层，不在 Route 中直接写 Prisma

## Docker 部署

```bash
# 生产环境
docker compose up -d                  # 启动应用 + 数据库
docker compose run --rm migrate       # 执行数据库迁移（独立命令）

# 开发环境
docker compose -f docker-compose.dev.yml up -d  # 仅启动 PostgreSQL
npm run dev                                     # 本地运行 Next.js
```

## 环境变量
必需:
- `DATABASE_URL` - PostgreSQL 连接字符串
- `NEXTAUTH_SECRET` - NextAuth 密钥 (至少 32 字符)

可选:
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - Redis 缓存
- `R2_*` - Cloudflare R2 存储
- `SENTRY_DSN` - 错误监控
- `RESEND_API_KEY` - 邮件服务

## 常用命令
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run lint         # 运行 ESLint
npx prisma generate  # 生成 Prisma 客户端
npx prisma migrate   # 运行数据库迁移
```
