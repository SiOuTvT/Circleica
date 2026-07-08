/**
 * 环境变量统一管理
 *
 * 设计原则：
 * - Build 时不做验证（next build 使用占位符）
 * - 首次访问 env 对象时验证（运行时）
 * - 验证失败：dev 警告，prod 退出
 * - 可选变量使用 undefined 而非空字符串
 */

import { z } from "zod"

// ── Schema 定义 ──────────────────────

const envSchema = z.object({
  // 必需
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL 不能为空"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET 至少 32 个字符"),

  // 有默认值
  NEXTAUTH_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // 可选 - Cloudflare R2
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional().or(z.literal("")),

  // 可选 - Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // 可选 - Sentry
  SENTRY_DSN: z.string().url().optional(),

  // 可选 - Resend
  RESEND_API_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

// ── 懒验证 ───────────────────────────

let _env: Env | null = null

function validate(): Env {
  // Build 时返回占位符（NODE_ENV 未设或为 undefined 时视为 build 阶段）
  const isBuild = !process.env.NEXT_RUNTIME && process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test"

  const parsed = envSchema.safeParse(process.env)

  if (parsed.success) {
    return parsed.data
  }

  // Build 阶段容忍缺失，返回默认值
  if (isBuild || process.env.NEXT_BUILD_STAGE) {
    return {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "build-placeholder-secret-not-used-at-runtime-32chars",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
      NODE_ENV: "production",
    } as Env
  }

  // 运行时验证失败
  const issues = parsed.error.issues.map(i => `  ${i.path.join(".")}: ${i.message}`).join("\n")
  console.error(`\n❌ 环境变量验证失败:\n${issues}\n`)

  if (process.env.NODE_ENV === "production") {
    process.exit(1)
  }

  // 开发环境：返回部分值，不崩溃
  return {
    DATABASE_URL: process.env.DATABASE_URL || "",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "dev-secret-placeholder-min-32-chars-long",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
    NODE_ENV: (process.env.NODE_ENV as Env["NODE_ENV"]) || "development",
  } as Env
}

/**
 * 环境变量对象（首次访问时验证，后续直接返回缓存）
 */
export function getEnv(): Env {
  if (!_env) {
    _env = validate()
  }
  return _env
}

/**
 * 可选功能检测
 */
export function getFeatures() {
  const e = getEnv()
  return {
    redis: !!(e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN),
    sentry: !!e.SENTRY_DSN,
    email: !!e.RESEND_API_KEY,
    r2: !!(e.R2_BUCKET_NAME && e.R2_ACCOUNT_ID),
  } as const
}

// ── 兼容旧代码的导出 ────────────────
// 使用 Proxy 实现懒加载，避免 import 时触发验证
export const env: Env = new Proxy({} as Env, {
  get(_, prop) {
    return (getEnv() as Record<string, unknown>)[prop as string]
  },
})

export const features = new Proxy({} as ReturnType<typeof getFeatures>, {
  get(_, prop) {
    return (getFeatures() as Record<string, unknown>)[prop as string]
  },
})
