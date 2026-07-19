/**
 * 统一服务配置层
 *
 * 配置优先级：SiteSetting JSON key > 旧 SiteSetting 平铺 key > process.env
 * 模块加载时自动触发 DB 读取（非阻塞），读取完成前使用 env fallback。
 * 修改后台配置后重启应用即可生效。
 */

import { prisma } from "./prisma"
import { logger } from "./logger"

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl: string
}

export interface RedisConfig {
  url: string
  token: string
}

/** 单个 email provider 的完整配置 */
export interface EmailProviderEntry {
  id: string
  config: Record<string, string>
}

let _r2: R2Config | null = null
let _redis: RedisConfig | null = null
let _emailProviders: EmailProviderEntry[] = []
let _providerOrder = ""
let _dbReady = false

// 模块加载时触发（非阻塞），完成后 _dbReady = true
const _initPromise = loadFromDB()

async function loadFromDB() {
  // 读取所有可能的 email key（新 JSON 格式 + 旧平铺格式 + 优先级）
  const DB_KEYS = [
    "r2_account_id", "r2_access_key_id", "r2_secret_access_key",
    "r2_bucket_name", "r2_public_url",
    "redis_url", "redis_token",
    // 新格式
    "email_provider_resend", "email_provider_brevo", "email_provider_smtp",
    "email_provider_order",
    // 旧格式（fallback）
    "resend_api_key", "brevo_api_key",
    "email_from_name", "email_from_email",
  ]

  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: DB_KEYS } },
      select: { key: true, value: true },
    })
    const db = Object.fromEntries(rows.map(r => [r.key, r.value]))

    // ── R2 ──
    if (db.r2_account_id && db.r2_access_key_id && db.r2_secret_access_key && db.r2_bucket_name && db.r2_public_url) {
      _r2 = {
        accountId: db.r2_account_id,
        accessKeyId: db.r2_access_key_id,
        secretAccessKey: db.r2_secret_access_key,
        bucketName: db.r2_bucket_name,
        publicUrl: db.r2_public_url,
      }
    }

    // ── Redis ──
    if (db.redis_url && db.redis_token) {
      _redis = { url: db.redis_url, token: db.redis_token }
    }

    // ── Email providers ──
    _providerOrder = db.email_provider_order || ""

    // 加载 provider 配置（新 JSON 格式优先，fallback 旧平铺 key）
    const providerConfigs = loadProviderConfigs(db)
    _emailProviders = buildEmailProviders(_providerOrder, providerConfigs)

    _dbReady = true

    // 日志
    if (_r2) logger.system.info("[ServiceConfig] R2: 数据库配置")
    if (_redis) logger.system.info("[ServiceConfig] Redis: 数据库配置")
    if (_emailProviders.length > 0) logger.system.info(`[ServiceConfig] Email providers: ${_emailProviders.map(p => p.id).join(", ")}`)
  } catch {
    logger.system.warn("[ServiceConfig] 数据库读取失败，使用环境变量")
    _dbReady = true
  }

  // ── 环境变量 fallback ──
  if (!_r2 && process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET_NAME) {
    _r2 = {
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      bucketName: process.env.R2_BUCKET_NAME,
      publicUrl: process.env.R2_PUBLIC_URL || "",
    }
    logger.system.info("[ServiceConfig] R2: 环境变量")
  }
  if (!_redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _redis = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }
    logger.system.info("[ServiceConfig] Redis: 环境变量")
  }
  if (!_emailProviders.length) {
    const envProviders = loadEnvProviderFallback()
    if (envProviders.length) {
      _emailProviders = envProviders
      logger.system.info(`[ServiceConfig] Email: 环境变量 (${envProviders.map(p => p.id).join(", ")})`)
    }
  }

  if (!_r2) logger.system.info("[ServiceConfig] R2: 未配置（使用本地存储）")
  if (!_redis) logger.system.info("[ServiceConfig] Redis: 未配置（使用内存缓存）")
  if (!_emailProviders.length) logger.system.info("[ServiceConfig] Email: 未配置（邮件功能不可用）")
}

/**
 * 从 DB 记录中加载 per-provider 配置
 * 优先读新 JSON key，fallback 到旧平铺 key
 */
function loadProviderConfigs(db: Record<string, string>): Map<string, Record<string, string>> {
  const configs = new Map<string, Record<string, string>>()

  // 新 JSON 格式：email_provider_resend → { apiKey, fromName, fromEmail }
  for (const providerId of ["resend", "brevo", "smtp"]) {
    const key = `email_provider_${providerId}`
    if (db[key]) {
      try {
        const parsed = JSON.parse(db[key])
        if (typeof parsed === "object" && parsed !== null) {
          configs.set(providerId, parsed as Record<string, string>)
        }
      } catch {
        logger.system.warn(`[ServiceConfig] ${key} JSON 解析失败，忽略`)
      }
    }
  }

  // 旧格式 fallback：平铺 key → 合并到 configs
  const globalFromName = db.email_from_name || ""
  const globalFromEmail = db.email_from_email || ""

  if (!configs.has("resend") && db.resend_api_key) {
    configs.set("resend", {
      apiKey: db.resend_api_key,
      ...(globalFromName ? { fromName: globalFromName } : {}),
      ...(globalFromEmail ? { fromEmail: globalFromEmail } : {}),
    })
  }
  if (!configs.has("brevo") && db.brevo_api_key) {
    configs.set("brevo", {
      apiKey: db.brevo_api_key,
      ...(globalFromName ? { fromName: globalFromName } : {}),
      ...(globalFromEmail ? { fromEmail: globalFromEmail } : {}),
    })
  }

  return configs
}

/** 根据 providerOrder + configs 构建有序 provider 列表 */
function buildEmailProviders(orderStr: string, configs: Map<string, Record<string, string>>): EmailProviderEntry[] {
  const order = orderStr
    ? orderStr.split(",").map(s => s.trim()).filter(Boolean)
    : ["resend"] // 缺省向后兼容

  const result: EmailProviderEntry[] = []
  for (const id of order) {
    const config = configs.get(id)
    if (config && hasRequiredFields(id, config)) {
      result.push({ id, config })
    }
  }
  return result
}

/** 检查 provider config 是否包含必需字段 */
function hasRequiredFields(providerId: string, config: Record<string, string>): boolean {
  if (providerId === "resend") return !!config.apiKey
  if (providerId === "brevo") {
    // Brevo: API 模式需要 apiKey，SMTP 模式需要 host + username + password
    return config.mode === "smtp"
      ? !!(config.host && config.username && config.password)
      : !!config.apiKey
  }
  if (providerId === "smtp") return !!(config.host && config.username && config.password)
  return false
}

/** 环境变量 fallback */
function loadEnvProviderFallback(): EmailProviderEntry[] {
  const result: EmailProviderEntry[] = []
  if (process.env.RESEND_API_KEY) {
    result.push({ id: "resend", config: { apiKey: process.env.RESEND_API_KEY } })
  }
  if (process.env.BREVO_API_KEY) {
    result.push({ id: "brevo", config: { apiKey: process.env.BREVO_API_KEY } })
  }
  return result
}

/** 等待 DB 配置加载完成（可选调用，确保使用 DB 配置） */
export function waitForServiceConfig(): Promise<void> {
  return _initPromise
}

/** 同步获取 R2 配置 */
export function getR2Config(): R2Config | null { return _r2 }

/** 同步获取 Redis 配置 */
export function getRedisConfig(): RedisConfig | null { return _redis }

/** 同步获取有序、有配置的 email provider 列表 */
export function getEmailProviders(): EmailProviderEntry[] {
  return _emailProviders
}

/**
 * 同步获取发件人地址（"Name <email>" 格式）
 * 从首个 provider 的 config 中取 fromName/fromEmail，fallback 到默认值
 */
export function getEmailFrom(): string {
  const first = _emailProviders[0]
  const name = first?.config.fromName || "Fangame"
  const email = first?.config.fromEmail || "noreply@example.com"
  return `${name} <${email}>`
}

/** 获取指定 provider 的配置（供 admin API 使用） */
export function getProviderConfig(id: string): Record<string, string> | undefined {
  return _emailProviders.find(p => p.id === id)?.config
}

/** 是否有任何 email provider 可用 */
export function getEmailConfigured(): boolean {
  return _emailProviders.length > 0
}

/** 获取当前 provider 优先级列表 */
export function getProviderOrder(): string[] {
  return _providerOrder
    ? _providerOrder.split(",").map(s => s.trim()).filter(Boolean)
    : []
}
