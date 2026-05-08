import { z } from "zod"

/**
 * 环境变量验证 Schema
 * 应用启动时自动验证所有必需的环境变量
 * 缺失或格式错误的变量会导致明确的错误信息，而非运行时莫名崩溃
 */
const envSchema = z.object({
  // 数据库
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL 必须是有效的数据库连接 URL")
    .startsWith("postgresql://", "DATABASE_URL 必须以 postgresql:// 开头"),

  // NextAuth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET 至少 32 个字符，请使用 `openssl rand -base64 32` 生成"),
  NEXTAUTH_URL: z
    .string()
    .url("NEXTAUTH_URL 必须是有效的 URL")
    .optional()
    .default("http://localhost:3000"),

  // UploadThing
  UPLOADTHING_TOKEN: z
    .string()
    .min(1, "UPLOADTHING_TOKEN 不能为空"),

  // Upstash Redis（可选，不配置时使用内存缓存）
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url("UPSTASH_REDIS_REST_URL 必须是有效的 URL")
    .optional(),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .min(1, "UPSTASH_REDIS_REST_TOKEN 不能为空")
    .optional(),

  // Sentry（可选，不配置时跳过错误监控）
  SENTRY_DSN: z
    .string()
    .url("SENTRY_DSN 必须是有效的 URL")
    .optional(),

  // 邮件服务
  RESEND_API_KEY: z
    .string()
    .min(1, "RESEND_API_KEY 不能为空")
    .optional(),

  // 运行环境
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
})

/**
 * 验证环境变量
 * 在构建时/启动时调用，确保所有必需变量都已正确配置
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error("❌ 环境变量验证失败:")
    console.error("")
    for (const issue of parsed.error.issues) {
      console.error(`  • ${issue.path.join(".")}: ${issue.message}`)
    }
    console.error("")
    console.error("请检查 .env 文件并补充缺失的变量。参考 .env.example")
    
    // 在开发环境给出警告但不崩溃，在生产环境直接退出
    if (process.env.NODE_ENV === "production") {
      process.exit(1)
    }
    
    // 开发环境返回一个部分填充的对象
    return {
      DATABASE_URL: process.env.DATABASE_URL || "",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "dev-secret-placeholder-min-32-chars-long",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
      UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN || "",
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      SENTRY_DSN: process.env.SENTRY_DSN,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "development",
    }
  }

  return parsed.data
}

export const env = validateEnv()

/**
 * 检查可选功能是否已配置
 */
export const features = {
  redis: !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  sentry: !!env.SENTRY_DSN,
  email: !!env.RESEND_API_KEY,
} as const