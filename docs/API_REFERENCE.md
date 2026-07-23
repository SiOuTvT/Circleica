# API 参考（Circleica）

> 面向：前端开发者、需要对接 REST 接口的集成方。所有接口前缀为 `/api`。

## 统一响应格式

每个响应都是如下信封（成功或失败一致）：

```jsonc
{
  "success": true,
  "data": { },            // 成功时存在
  "error": "消息",          // 失败时存在
  "code": "VALIDATION_ERROR", // 失败时的语义码
  "details": { "field": ["错误信息"] }, // 422 时字段级错误
  "pagination": {           // 列表接口存在
    "page": 1, "pageSize": 20, "total": 135, "totalPages": 7
  }
}
```

> 老接口可能直接返回数组/对象（无 `success` 包裹）。前端请用 `parseApiResponse()`（见 `src/lib/api-handler.ts`）统一解包，兼容两种形态。

## 错误处理契约

所有路由必须用 `withHandler()` 包装。异常按以下顺序映射：

| 抛出的异常 | HTTP 状态 | `code` | 说明 |
|---|---|---|---|
| `AppError` 子类（如 `NotFoundError`） | 由子类 `status` 决定（如 404） | 子类 `code` | 业务异常，信息对前端友好 |
| `ZodError` | `422` | `VALIDATION_ERROR` | 自动展开为 `details` 字段级错误 |
| 其他（含 Prisma 预期内异常） | `500` | `INTERNAL` | 未知异常，记入日志 |

**速率限制**：被限流的接口返回 `429`，并带 `Retry-After: 60` 头，`code` 为 `RATE_LIMITED`。

## 鉴权

- 基于 NextAuth v5 会话（Cookie + JWT）。
- 需登录的接口在 **Service 层** 调用 `requireAuth()`；需管理员在 Service 层调用 `requireAdminRole("ADMIN" | "SUPER_ADMIN")`。
- Service 层会**从数据库重新读取最新角色**，因此角色变更即时生效，不依赖过期会话。

## 分页约定

列表接口接受 query：`?page=1&pageSize=20`，响应含 `pagination` 块（见上）。

## 路由总览（按域分组）

| 域 | 路由前缀 | 典型能力 |
|---|---|---|
| 认证 | `/api/auth/*` | register / login(NextAuth) / forgot-password / reset-password / verify-email / change-email |
| 游戏资料 | `/api/games/*` | 列表/详情、收藏、评分、播放状态、评论、举报、资源（图/音频）、浏览量 |
| 论坛 | `/api/forum/posts/*` `/api/forum/comments/*` | 帖子 CRUD、评论、点赞、解决态 |
| 用户 / 资料 | `/api/user/*` `/api/profile/*` | 个人资料、头像框、统计、他人资料页 |
| 创作者 | `/api/creators/*` | 创作者主页、随机、保存、VNDB 关联 |
| 标签 / 合集 | `/api/tags/*` `/api/collections/*` `/api/curated-collections/*` | 标签按位置、合集、精选合集 |
| 音乐 | `/api/music/*` | 音频素材列表 |
| 签到 / 互动 | `/api/checkin*` `/api/emotional-messages` `/api/achievements*` | 每日签到、情感消息、成就 |
| 通知 | `/api/notifications/*` | 列表、未读计数 |
| 搜索 | `/api/search/*` `/api/search/suggestions` | 全文检索、补全 |
| 上传 | `/api/upload` `/api/uploadthing` | 本地 / R2 / UploadThing |
| 翻译 | `/api/translate` | 文本翻译 |
| 后台（管理） | `/api/admin/*` | 用户/角色/内容审核/站点设置/审计日志/VNDB 导入等 |
| 站点初始化 | `/api/setup*` | 首位超管创建、上传 |
| 运维 | `/api/health` `/api/sentry*` | 健康检查、Sentry tunnel |

> 完整路径以 `src/app/api/**/route.ts` 源码为准。新增接口时务必在 Service 层加 `requireAuth/requireAdminRole` 守卫。

## 请求示例

注册（Zod 校验失败会返回 422 + `details`）：

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"secret123","name":"alice"}'
```

获取游戏列表（带分页）：

```bash
curl "http://localhost:3000/api/games?page=1&pageSize=20" \
  -H "Authorization: Bearer <session-cookie 由浏览器自动携带>"
```

## 错误排查

- 看到 `{"success":false,"code":"INTERNAL"}`：这是未知异常（含 Prisma 预期内异常未映射），查服务端日志的 `[INTERNAL]` 行。
- 看到 `VALIDATION_ERROR`：按 `details` 逐字段修正请求体。
- 看到 `429`：按 `Retry-After` 秒后重试。
