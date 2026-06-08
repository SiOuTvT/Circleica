# Fangame - Galgame/视觉小说社区平台

## 项目概述
Next.js 16 全栈应用，为 Galgame/视觉小说爱好者提供社区平台。

## 技术栈
- **前端**: React 19, Tailwind CSS, shadcn/ui, TipTap 富文本编辑器
- **后端**: Next.js App Router, Prisma ORM, PostgreSQL
- **认证**: NextAuth v5 (Credentials + JWT)
- **存储**: Cloudflare R2 (S3 兼容), UploadThing
- **缓存**: Upstash Redis (可选，自动降级为内存缓存)
- **监控**: Sentry
- **API**: VNDB (视觉小说数据库)

## 项目结构
```
src/
├── app/                    # Next.js App Router 页面
│   ├── admin/             # 管理后台页面
│   ├── api/               # API 路由
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
│   ├── api-response.ts    # 统一 API 响应格式
│   ├── auth.ts            # NextAuth 配置
│   ├── prisma.ts          # Prisma 客户端
│   ├── redis.ts           # Redis/内存缓存
│   ├── rate-limit.ts      # 速率限制
│   └── vndb.ts            # VNDB API 客户端
└── types/                 # TypeScript 类型定义
```

## 开发规范
- 使用 TypeScript 严格模式
- API 响应使用 `@/lib/api-response` 中的工具函数
- 输入验证使用 Zod schema (定义在 `@/lib/validations`)
- 数据库操作使用 Prisma ORM
- 文件上传使用 R2 或 UploadThing
- 速率限制使用 `@/lib/rate-limit`

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
