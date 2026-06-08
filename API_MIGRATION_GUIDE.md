# API 响应格式迁移指南

## 目标格式

所有 API 端点统一使用 `@/lib/api-response.ts` 中的工具函数。

### 成功响应
```typescript
import { success, ok, created, paginated } from "@/lib/api-response"

// 200 成功
return success({ id: 1, name: "test" })
// → { success: true, data: { id: 1, name: "test" } }

// 201 创建成功
return created({ id: 1, name: "test" })

// 200 带分页
return paginated(games, { page: 1, pageSize: 20, total: 100 })
// → { success: true, data: [...], pagination: { page: 1, pageSize: 20, total: 100, totalPages: 5 } }
```

### 错误响应
```typescript
import { badRequest, unauthorized, forbidden, notFound, conflict, serverError } from "@/lib/api-response"

// 400 参数错误
return badRequest("用户名不能为空")

// 401 未登录
return unauthorized()

// 403 无权限
return forbidden()

// 404 不存在
return notFound("游戏不存在")

// 409 冲突
return conflict("今日已签到", { alreadyDone: true })

// 500 服务器错误
return serverError()
```

## 迁移步骤

### 1. 替换错误响应
```typescript
// ❌ 旧格式
return NextResponse.json({ error: "未登录" }, { status: 401 })

// ✅ 新格式
return unauthorized()
```

### 2. 替换成功响应
```typescript
// ❌ 旧格式
return NextResponse.json({ ok: true })
return NextResponse.json(game)
return NextResponse.json({ data: games, total })

// ✅ 新格式
return success({ ok: true })
return success(game)
return paginated(games, { page, pageSize, total })
```

### 3. 使用错误处理包装器
```typescript
import { withErrorHandler } from "@/lib/api-response"

async function handleGet(req: NextRequest) {
  // ... 业务逻辑
}

export const GET = withErrorHandler(handleGet)
```

## 迁移优先级

| 优先级 | 端点 | 原因 |
|--------|------|------|
| 高 | `/api/games/*` | 前台核心接口 |
| 高 | `/api/auth/*` | 认证相关 |
| 中 | `/api/forum/*` | 社区功能 |
| 中 | `/api/comments/*` | 评论系统 |
| 低 | `/api/admin/*` | 后台管理 |

## 已迁移的端点

- [x] `/api/checkin`
- [x] `/api/games/[id]/comments`
- [x] `/api/games/[id]/favorite`
- [x] `/api/collections`
- [x] `/api/forum/posts` (POST)
- [x] `/api/forum/posts/[id]/comments`
- [x] `/api/comments/[id]`
- [x] `/api/notifications`
