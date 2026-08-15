# 架构

## 概览

Circleica 是一个 Next.js 16（App Router）应用，同时承载两个站点：**Circleica（资源站）** 与 **Galvelica（资料馆）**。两者共用代码库，但通过路由分组与独立布局保持品牌、主题、配色的完全隔离。

技术分层：

- **表现层**：以 React Server Component（RSC）为主。公共列表 / 详情页在服务器端取数并渲染，只有真正需要交互的部分（表单、Tab、画廊、搜索框）才是 Client Component。
- **接口层**：`/api/*` 路由处理器统一走 `src/lib/api-handler.ts`，负责 Zod 校验、限流、CSRF、统一错误格式。
- **基础设施层**：`src/lib/` 下是认证、存储、缓存、限流、CSRF、权限、遥测等可复用模块。
- **数据层**：Prisma + PostgreSQL。
- **资源层**：Cloudflare R2（S3 兼容）。
- **请求层**：`src/proxy.ts` 在请求进出时统一注入安全响应头、CSRF 校验、CSP、HSTS。

## 目录结构

```
src/
  app/
    (home)/            首页
    games/             游戏列表 / 详情 / 搜索 / 排行 / 发现
    galvelica/         资料馆（作品 / Tag / Studio / Creator / Year）
    user/              用户主页
    forum/  notifications/  社区与消息
    admin/             管理后台（受角色保护）
    api/               接口路由
    card/              分享名片（动态渲染）
  components/          卡片、画廊、布局等
  lib/
    auth.ts            NextAuth 配置
    api-handler.ts     统一接口边界
    csrf.ts            同源校验
    rate-limit.ts      限流（Redis + 内存兜底）
    permissions.ts     后台路由权限
    storage.ts         R2 适配器
    redis.ts           缓存 / 限流后端
    telemetry.ts       Sentry / OTel 接入
  proxy.ts             请求层安全与头
prisma/                schema 与迁移
scripts/               数据工程工具
```

## 渲染与缓存策略

- 公共页面用 `unstable_cache` / Redis 缓存，并带 `revalidate` 时效；缓存键区分 NSFW 模式，避免跨用户串数据。
- 列表与详情均分页；客户端交互组件用 `AbortController` 控制请求生命周期。
- 图片优先走 `next/image`（CDN 资源按配置决定是否走优化器），画廊缩略图懒加载 + 降质。

## 认证与权限

- 登录基于凭据，JWT 会话，Cookie `httpOnly` + `sameSite=lax`。
- 角色分普通用户与管理员；超级管理员路由按路径段精确匹配。
- 会话中的角色 / 邮箱验证状态每次会话从数据库读取，避免旧令牌长期固化权限。

## 资源存储

- 资源（封面、立绘、音频等）存 R2，代码经 `src/lib/storage.ts` 的 S3 适配器访问。
- 当前为公开读桶；是否改为私有 + 签名 URL 是产品决策（见安全策略与部署验收 C-1）。

## 可观测

见 [OBSERVABILITY.md](OBSERVABILITY.md)。错误经 Sentry，Trace / Metric 经 OpenTelemetry，均仅在配置了对应凭证时启用，否则静默降级。
