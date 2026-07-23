# 入门指南（Circleica）

> 面向：首次克隆仓库、要从零把项目跑起来的贡献者。预计 15 分钟内完成。

## 前置条件

- **Node.js** 20+（与 `@types/node@^20` 对齐）
- **PostgreSQL** 16（本地可用 `docker-compose.dev.yml` 起一个）
- **npm** 9+
- 一个 ≥32 字符的随机串，用作 `NEXTAUTH_SECRET`

## 步骤 1：克隆并安装

```bash
git clone <repo-url> && cd fangame
npm install
```

## 步骤 2：配置环境变量

仓库已提供 `.env.example`，复制为 `.env` 再填空：

```bash
cp .env.example .env
```

`.env` 中**至少**需要：

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL 连接串，如 `postgresql://fangame:fangame@localhost:5432/fangame` |
| `NEXTAUTH_SECRET` | ✅ | ≥32 字符随机串 |
| `NEXTAUTH_URL` | 否 | 默认 `http://localhost:3000` |
| `R2_*` / `UPSTASH_REDIS_*` / `SENTRY_DSN` / `RESEND_API_KEY` | 否 | 可选能力；留空则对应功能自动降级 |

> 校验在**运行时**由 `src/lib/env.ts` 用 Zod 执行：缺少必填项时，生产环境会直接 `process.exit(1)`，开发环境仅告警。

## 步骤 3：初始化数据库

```bash
npx prisma migrate dev     # 应用迁移 + 生成客户端
```

本地没有 PG？用开发编排一键起：

```bash
docker compose -f docker-compose.dev.yml up -d   # 仅起 PostgreSQL
```

## 步骤 4：启动开发服务器

```bash
npm run dev     # http://localhost:3000
```

首次打开站点，访问 `/setup` 完成初始化（创建首位 `SUPER_ADMIN` 管理员账号）。

## 步骤 5：验证一切正常

```bash
npm run lint          # ESLint（next/core-web-vitals）
npm run test           # Jest 单元 / 逻辑测试
npm run test:e2e      # Playwright 端到端（需先 npm run dev 或 build）
```

健康检查：`GET /api/health` 应返回 200。

## 下一步

- 想理解分层与关键模块 → [架构说明](ARCHITECTURE.md)
- 想调具体接口 → [API 参考](API_REFERENCE.md)
- 准备提 PR → [贡献指南](CONTRIBUTING.md)
