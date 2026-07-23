import { z } from "zod"
import { EMAIL } from "@/lib/config"

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
    .min(8, "密码至少 8 位")
    .max(128, "密码过长"),
})

export const loginSchema = z.object({
  identifier: z.string().min(1, "请输入用户名或邮箱"),
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
    .min(8, "密码至少 8 位")
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
    .max(5, "评分最高 5 分")
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
  category: z.enum(["discussion", "question", "showcase", "guide", "feedback"]).optional(),
})

export const forumCommentSchema = z.object({
  content: z
    .string()
    .min(1, "评论内容不能为空")
    .max(2000, "评论最多 2000 个字符"),
})

// ============ 管理员相关 ============

export const announcementCreateSchema = z.object({
  title: z.string().min(1, "公告标题不能为空").max(200, "标题最多 200 个字符"),
  summary: z.string().max(500, "摘要最多 500 个字符").optional().default(""),
  content: z.string().min(1, "公告内容不能为空").max(5000, "内容最多 5000 个字符"),
  imageUrl: z.string().url("图片链接格式不正确").max(500).optional().or(z.literal("")),
  link: z.string().url("外部链接格式不正确").max(500).optional().or(z.literal("")),
  status: z.enum(["draft", "published", "hidden"]).optional().default("draft"),
  isPinned: z.boolean().optional().default(false),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
})

export const announcementUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(500).optional(),
  content: z.string().min(1).max(5000).optional(),
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
  link: z.string().url().max(500).optional().or(z.literal("")),
  status: z.enum(["draft", "published", "hidden"]).optional(),
  isPinned: z.boolean().optional(),
  isActive: z.boolean().optional(),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
})

export const gameCreateSchema = z.object({
  title: z.string().min(1, "游戏标题不能为空").max(200),
  description: z.string().max(5000).optional(),
  coverImage: z.string().url().optional(),
  originalWork: z.string().max(200).optional(),
  englishName: z.string().max(200).optional(),
  studioName: z.string().max(200).optional(),
  isNsfw: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  creatorId: z.string().optional(),
})

export const gameResourceCreateSchema = z.object({
  resourceName: z.string().max(200).optional(),
  resourceNote: z.string().max(1000).optional(),
  platform: z.array(z.string().max(50)).max(10).optional(),
  language: z.array(z.string().max(50)).max(10).optional(),
  runType: z.array(z.string().max(50)).max(10).optional(),
  resourceContent: z.array(z.string().max(50)).max(10).optional(),
  entries: z.array(z.object({
    url: z.string().url("链接格式不正确").max(2000),
    extractCode: z.string().max(100).optional(),
    decompressCode: z.string().max(100).optional(),
    fileSize: z.string().max(50).optional(),
  })).min(1, "至少需要一个下载链接").max(20),
})

export const collectionCreateSchema = z.object({
  name: z.string().min(1, "收藏夹名称不能为空").max(50, "名称最多 50 个字符"),
  description: z.string().max(200).optional(),
})

export const achievementCreateSchema = z.object({
  name: z.string().min(1, "成就名称不能为空").max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(500).optional(),
  characterImage: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  conditionType: z.enum(["favorite_count", "comment_count", "play_count", "checkin_streak", "forum_post_count", "register_days"]),
  conditionTarget: z.number().int().min(1).max(10000),
  points: z.number().int().min(0).max(1000).optional(),
  hidden: z.boolean().optional(),
  isActive: z.boolean().optional(),
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

// ============ 邮件 Provider 配置 ============

const resendConfigSchema = z.object({
  apiKey: z.string().min(1, "Resend API Key 不能为空"),
  fromName: z.string().max(100).optional().default("Circleica"),
  fromEmail: z.string().email("发件邮箱格式不正确").max(255).optional().default(EMAIL.DEFAULT_FROM_EMAIL),
})

/** Brevo 支持 API 和 SMTP Relay 两种模式 */
const brevoConfigSchema = z.object({
  mode: z.enum(["api", "smtp"]).optional().default("api"),
  // API 模式
  apiKey: z.string().optional(),
  // SMTP Relay 模式
  host: z.string().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  // 共同字段
  fromName: z.string().max(100).optional().default("Circleica"),
  fromEmail: z.string().email("发件邮箱格式不正确").max(255).optional().default(EMAIL.DEFAULT_FROM_EMAIL),
}).superRefine((data, ctx) => {
  if (data.mode === "smtp") {
    if (!data.host) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SMTP 主机不能为空", path: ["host"] })
    if (!data.username) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "登录邮箱不能为空", path: ["username"] })
    if (!data.password) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Master Password 不能为空", path: ["password"] })
  } else {
    if (!data.apiKey) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Brevo API Key 不能为空", path: ["apiKey"] })
  }
})

const smtpConfigSchema = z.object({
  host: z.string().min(1, "SMTP 主机不能为空"),
  port: z.coerce.number().int().min(1, "端口不能为空").max(65535, "端口范围 1-65535"),
  username: z.string().min(1, "用户名不能为空"),
  password: z.string().min(1, "密码不能为空"),
  fromName: z.string().max(100).optional().default("Circleica"),
  fromEmail: z.string().email("发件邮箱格式不正确").max(255).optional().default(EMAIL.DEFAULT_FROM_EMAIL),
})

/** 单个 provider 配置校验（discriminatedUnion） */
export const emailProviderConfigSchema = z.discriminatedUnion("provider", [
  z.object({ provider: z.literal("resend"), config: resendConfigSchema }),
  z.object({ provider: z.literal("brevo"), config: brevoConfigSchema }),
  z.object({ provider: z.literal("smtp"), config: smtpConfigSchema }),
])

/** 所有 provider 配置 + 优先级顺序 */
export const emailProvidersSaveSchema = z.object({
  providers: z.record(z.string(), z.record(z.string(), z.string())),
  order: z.array(z.string()).min(0).max(5),
})
