# Circleica

同人 / 独立 Galgame（视觉小说）资源与资料平台。

项目由两个定位不同的站点组成，共用同一套代码库：

- **Circleica（主站 · 资源站）**：玩家在这里查找、下载、发布同人视觉小说游戏。
- **Galvelica（副站 · 资料馆）**：整理整个同人生态的作品、制作人、社团、标签与来源，提供收录与检索。**资料馆只收录、不提供下载**。

两个站点品牌、主题、配色、首页身份各自独立，不是同一套 UI 换皮。

## 技术栈

- 前端 / 框架：Next.js 16（App Router，React Server Components 为主，交互组件按需 Client Component）
- 语言：TypeScript
- 数据库：PostgreSQL + Prisma
- 缓存 / 限流：Redis（支持内存降级兜底）
- 资源存储：Cloudflare R2（S3 兼容）
- 可观测：Sentry（错误监控）+ OpenTelemetry（Trace / Metric）
- 部署：Docker Compose，TLS 由 Cloudflare 反向代理终止

## 目录速览

```
src/
  app/               路由（首页、游戏、Galvelica 资料馆、用户、社区、管理后台）
  components/        公共组件与卡片
  lib/              认证、API 边界、限流、CSRF、存储、Redis、遥测等基础设施
  proxy.ts          请求层：安全响应头、CSRF、CSP、HSTS
prisma/             Schema 与迁移
scripts/            数据对账 / 回填 / 摄入 / 校验等工程工具
docs/               架构、开发、部署、可观测、数据模型等正式文档
docs/launch-audit/  部署前审计证据（性能 / 安全 / 数据 / 验收）
```

## 快速开始

环境要求：Node.js 20+、PostgreSQL、Redis（可选，缺失时自动降级为内存）。

```bash
npm install
cp .env.example .env      # 填入 DATABASE_URL 等
npx prisma migrate deploy # 初始化 / 同步数据库结构
npm run dev               # 开发服务器
```

常用脚本见 `package.json` 与 `docs/DEVELOPMENT.md`。

## 文档

- [架构](docs/ARCHITECTURE.md)
- [开发指南](docs/DEVELOPMENT.md)
- [部署指南](docs/DEPLOYMENT.md)
- [可观测性](docs/OBSERVABILITY.md)
- [数据模型](docs/DATA_MODEL.md)
- [安全策略](SECURITY.md)
- [贡献方式](CONTRIBUTING.md)

## 当前状态

代码已完成部署前整备（性能、安全、数据完整性审计闭环，详见 `docs/launch-audit/`）。部署相关的最终验收（R2 / Sentry / OTel / HTTPS / Redis / CI / 回滚）在部署服务器执行，见 `docs/launch-audit/DEPLOY_ACCEPTANCE_CHECKLIST.md`。

许可证：AGPL-3.0。
