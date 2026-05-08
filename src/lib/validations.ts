import { z } from "zod"

/**
 * 通用验证 Schemas
 * 用于 API 路由的请求体验证，确保数据一致性
 */

// ============ 用户相关 ============

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少 3 个字符")
    .max(20, "用户名最多 20 个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  email: z
    .string()
    .email("邮箱格式不正确")
    .max(255, "邮箱过长"),
  password: z
    .string()
    .min(6, "密码至少 6 位")
    .max(128, "密码过长"),
})

export const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
})

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少 3 个字符")
    .max(20, "用户名最多 20 个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线")
    .optional(),
  bio: z.string().max(500, "简介最多 500 个字符").optional(),
  avatar: z.string().url("头像必须是有效的 URL").optional(),
  banner: z.string().url("封面必须是有效的 URL").optional(),
  faveGameId: z.string().optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "重置令牌不能为空"),
  password: z
    .string()
    .min(6, "密码至少 6 位")
    .max(128, "密码过长"),
})

// ============ 游戏相关 ============

export const gameCommentSchema = z.object({
  content: z
    .string()
    .min(1, "评论内容不能为空")
    .max(2000, "评论最多 2000 个字符"),
  rating: z
    .number()
    .int("评分必须是整数")
    .min(1, "评分最低 1 分")
    .max(10, "评分最高 10 分")
    .optional(),
})

export const gameSearchSchema = z.object({
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(["newest", "popular", "rating"]).default("newest"),
  engine: z.string().max(50).optional(),
  tag: z.string().max(50).optional(),
})

// ============ 论坛相关 ============

export const forumPostSchema = z.object({
  title: z
    .string()
    .min(1, "标题不能为空")
    .max(200, "标题最多 200 个字符"),
  content: z
    .string()
    .min(1, "内容不能为空")
    .max(10000, "内容最多 10000 个字符"),
  category: z.string().max(50).optional(),
})

export const forumCommentSchema = z.object({
  content: z
    .string()
    .min(1, "评论内容不能为空")
    .max(2000, "评论最多 2000 个字符"),
})

// ============ 管理员相关 ============

export const announcementSchema = z.object({
  title: z
    .string()
    .min(1, "公告标题不能为空")
    .max(200, "标题最多 200 个字符"),
  content: z
    .string()
    .min(1, "公告内容不能为空")
    .max(5000, "内容最多 5000 个字符"),
  pinned: z.boolean().default(false),
})

export const gameCreateSchema = z.object({
  title: z.string().min(1, "游戏标题不能为空").max(200),
  description: z.string().max(5000).optional(),
  coverImage: z.string().url().optional(),
  downloadUrl: z.string().url().optional(),
  engine: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  creatorId: z.string().optional(),
})

// ============ 通用工具 ============

/**
 * 通用分页参数
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * ID 参数验证
 */
export const idParamSchema = z.object({
  id: z.string().min(1, "ID 不能为空"),
})

import { NextResponse } from "next/server"

/**
 * 通用 API 响应包装
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  )
}

/**
 * Zod 验证错误格式化
 */
export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }))
}

/**
 * 安全解析请求体的通用函数
 */
export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; error: z.ZodError<z.infer<T>> }
  | { success: false; error: null; message: string }
> {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true, data: result.data }
  } catch {
    return { success: false, error: null, message: "请求体必须是有效的 JSON" }
  }
}
