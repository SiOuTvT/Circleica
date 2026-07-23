# Circleica

> 视觉小说 / Galgame 社区平台——把游戏资料库、论坛讨论、收藏签到、创作者工具与后台管理整合到一个全栈 Web 应用里。

**状态**：v0.1.0 · 预发布（Pre-release）。生产部署前需先补齐安全与数据一致性项（见 `docs/ARCHITECTURE.md` 末尾的「上线前必读」）。

## Why This Exists

Galgame 爱好者长期面临两个断层：游戏资料散落在 VNDB 等外部站、中文社区讨论又碎片化。Circleica 把"资料聚合 + 同好讨论 + 创作者分发"收进同一个有账号体系、有权限管理的社区，让一部作品从"被发现"到"被讨论"到"被二创"都在站内闭环。

## Quick Start

```bash
git clone <repo-url> && cd fangame
cp .env.example .env          # 至少填 DATABASE_URL 和 NEXTAUTH_SECRET(≥32字符)
npm install
npx prisma migrate dev        # 初始化本地数据库
npm run dev                   # 启动开发服务器 → http://localhost:3000
```

打开 `http://localhost:3000`，首次访问 `/setup` 完成站点初始化（创建首位超级管理员）。

## 核心能力一览

- **游戏资料库**：从 VNDB 拉取并缓存元数据，支持标签、合集、收藏、评分、播放状态。
- **论坛**：帖子 / 评论 / 点赞 / 解决态，带通知与举报。
- **互动体系**：每日签到、情感消息、成就、创作者主页。
- **创作者工具**：上传素材（本地或 Cloudflare R2）、富文本简介（DOMPurify 净化）。
- **后台管理**：用户 / 角色 / 内容审核 / 站点配置 / 审计日志。

## 技术栈

Next.js 16（App Router）· React 19 · TypeScript（严格模式）· Prisma 6 + PostgreSQL · NextAuth v5 · Tailwind + shadcn/ui · TipTap · Zod · Sentry · UploadThing / R2 · Upstash Redis（可选，自动降级内存）。

## 文档导航

| 文档 | 用途 | 读者 |
|---|---|---|
| [架构说明](docs/ARCHITECTURE.md) | 分层、数据流、关键模块、部署模型 | 新成员 / 架构评审 |
| [入门指南](docs/GETTING_STARTED.md) | 从零跑起来的逐步教程 | 首次贡献者 |
| [API 参考](docs/API_REFERENCE.md) | 响应格式、鉴权、分页、错误码、路由总览 | 前端 / 集成方 |
| [贡献指南](docs/CONTRIBUTING.md) | 分支、规范、测试、PR 流程 | 所有贡献者 |
| [文档规范](docs/DOC_STANDARDS.md) | 文档怎么写（团队 house style） | 所有贡献者 |

## License

见仓库根目录 `LICENSE`。
