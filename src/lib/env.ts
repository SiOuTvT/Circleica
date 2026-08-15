/**
 * 环境变量统一管理
 *
 * 设计原则：
 * - Build 时不做验证（next build 使用占位符）
 * - 首次访问 env 对象时验证（运行时）
 * - 验证失败：dev 警告，prod 退出
 * - 可选变量使用 undefined 而非空字符串
 *   （容器编排常以 `${VAR:-}` 注入空串，见 docker-compose.yml；
 *    空串必须在校验前归一为 undefined，否则 .url() / .default() 均会失误 —— 详见 normalizeEnv）
 */

import { z } from "zod"
import { logger } from "./logger"

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
  R2_PUBLIC_URL: z.string().url().optional(),

  // 可选 - Upstash Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // 可选 - Sentry
  // SENTRY_DSN：服务端 / 构建期使用
  // NEXT_PUBLIC_SENTRY_DSN：浏览器端使用（Next 只把 NEXT_PUBLIC_* 内联进客户端 bundle）
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // 可选 - OpenTelemetry / 可观测性
  // OTEL_EXPORTER_OTLP_ENDPOINT：OTel Collector 的 OTLP HTTP 端点（如 http://otel-collector:4318）。
  //   配置后启用 Trace / Metrics / Logs 采集；留空则整站降级为「无监控」模式（不影响任何业务）。
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),

  // 可选 - 应用版本（Sentry release / OTel resource.service.version / 部署版本关联）
  APP_VERSION: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),

  // 可选 - Resend
  RESEND_API_KEY: z.string().optional(),

  // 可选 - Brevo
  BREVO_API_KEY: z.string().optional(),
  EMAIL_PROVIDER_ORDER: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

// ── 空值归一 ─────────────────────────

/**
 * 把空字符串 / 纯空白的环境变量视为「未配置」，在校验前剔除。
 *
 * 背景：docker-compose / Coolify 以 `${VAR:-}` 形式注入变量，宿主未设置时
 * 得到的是空字符串而非 undefined。若直接交给 zod：
 * - `z.string().url().optional()` → 空串不是 undefined，仍走 url() 校验 → 失败
 * - `z.string().url().default(...)` → default 仅对 undefined 生效 → 同样失败
 * 两者在生产都会命中 `process.exit(1)`，导致「变量留空 = 容器起不来」。
 *
 * 归一后：留空 == 未配置 == undefined，可选变量正常跳过、有默认值的正常回落默认值；
 * 必需变量（DATABASE_URL / NEXTAUTH_SECRET）留空仍会正确报缺失。
 */
function normalizeEnv(source: NodeJS.ProcessEnv): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string" && value.trim() === "") continue
    normalized[key] = value
  }
  return normalized
}

// ── 懒验证 ───────────────────────────

let _env: Env | null = null

function validate(): Env {
  // Build 时返回占位符（NODE_ENV 未设或为 undefined 时视为 build 阶段）
  const isBuild = !process.env.NEXT_RUNTIME && process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test"

  const parsed = envSchema.safeParse(normalizeEnv(process.env))

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
  logger.system.error(`环境变量验证失败:\n${issues}`)

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
    sentry: !!(e.SENTRY_DSN || e.NEXT_PUBLIC_SENTRY_DSN),
    // OpenTelemetry 采集：配置了 OTLP 端点即视为启用（Trace/Metrics/Logs → Grafana）
    otel: !!(e.OTEL_EXPORTER_OTLP_ENDPOINT),
    email: !!(e.RESEND_API_KEY || e.BREVO_API_KEY),
    // 注意: 此值仅反映环境变量，DB 配置的能力检查见 service-config.getEmailConfigured()
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
