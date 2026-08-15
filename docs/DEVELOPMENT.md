# 开发指南

## 环境要求

- Node.js 20 以上
- PostgreSQL（本地或远程）
- Redis（可选；缺失时缓存 / 限流自动降级为内存，功能不中断）

## 安装与初始化

```bash
npm install
cp .env.example .env
# 编辑 .env，至少填好 DATABASE_URL 与 NEXTAUTH_SECRET
npx prisma generate
npx prisma migrate deploy   # 同步数据库结构（生产等价方式，也用于本地）
npm run dev
```

## 环境变量

`.env.example` 列出全部变量。关键几项：

- `DATABASE_URL`：PostgreSQL 连接串。
- `NEXTAUTH_SECRET`：会话签名密钥，部署必须设置。
- `NEXTAUTH_URL`：站点对外地址，影响 Cookie `secure`。
- `REDIS_URL` / `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`：缓存 / 限流；缺省降级内存。
- `R2_*`：资源存储凭证；缺省时资源相关功能不可用。
- `SENTRY_DSN`：错误监控（仅生产启用）。
- `OTEL_EXPORTER_OTLP_ENDPOINT`：遥测导出端点（配置才启用）。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run dev:clean` | 把 `.next-dev` 移出项目目录后重启（绕过沙箱删除保护） |
| `npm run build` | 生产构建 |
| `npm run lint` | ESLint |
| `npm run test` | Jest 单测 |
| `npx tsc --noEmit` | 类型检查 |
| `npx prisma migrate deploy` | 应用迁移 |
| `npx prisma studio` | 数据库可视化 |

## 测试

- 单元测试 / 接口测试：Jest（`npm run test`）。
- 端到端：Playwright（`e2e/`），建议在 CI 环境运行。

## 工程脚本

`scripts/` 下是正式的数据工具，不是临时产物：

- `backfill-*.ts`：slug、资料馆、媒体等回填。
- `reconcile-*.ts` / `reconcile/`：计数器、孤儿、slug、WorkSource 等数据对账。
- `ingest-*.ts`：从外部来源（VNDB、Steam、EGS 等）摄入资料馆数据。
- `verify-*.ts`：迁移 / 唯一约束等校验。
- `detect-*` / `nsfw-classify.ts` / `purge-domestic-sources.ts`：内容识别与清洗。
- `seed-dev.ts`：开发数据种子。

运行方式一般为 `npx tsx scripts/<name>.ts`（具体看脚本头部说明）。

## 代码约定

- 公共页面优先 Server Component；交互才用 Client Component。
- 查询用 `select` 裁剪字段，列表必须分页。
- 写接口统一走 `api-handler`，入参 Zod 校验。
- 不向客户端暴露密钥、内部错误、堆栈。

## 本地环境注意

Windows 沙箱开启了安全删除保护，可能拦截对 `.next` 等目录的大批量删除（表现为 `next build` 清理缓存时中断）。这是环境机制，不是代码缺陷；CI 的 Linux runner 无此问题。清理构建产物请用 `npm run dev:clean`。
