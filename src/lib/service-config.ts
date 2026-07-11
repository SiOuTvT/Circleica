/**
 * 统一服务配置层
 *
 * 配置优先级：SiteSetting（数据库）> process.env（环境变量）
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

let _r2: R2Config | null = null
let _redis: RedisConfig | null = null
let _resend: string | null = null
let _dbReady = false

// 模块加载时触发（非阻塞），完成后 _dbReady = true
const _initPromise = loadFromDB()

async function loadFromDB() {
  const DB_KEYS = [
    "r2_account_id", "r2_access_key_id", "r2_secret_access_key",
    "r2_bucket_name", "r2_public_url",
    "redis_url", "redis_token",
    "resend_api_key",
  ]

  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: DB_KEYS } },
      select: { key: true, value: true },
    })
    const db = Object.fromEntries(rows.map(r => [r.key, r.value]))

    if (db.r2_account_id && db.r2_access_key_id && db.r2_secret_access_key && db.r2_bucket_name && db.r2_public_url) {
      _r2 = {
        accountId: db.r2_account_id,
        accessKeyId: db.r2_access_key_id,
        secretAccessKey: db.r2_secret_access_key,
        bucketName: db.r2_bucket_name,
        publicUrl: db.r2_public_url,
      }
    }
    if (db.redis_url && db.redis_token) {
      _redis = { url: db.redis_url, token: db.redis_token }
    }
    if (db.resend_api_key) {
      _resend = db.resend_api_key
    }

    _dbReady = true

    // DB 中已配置的服务打日志
    if (_r2) logger.system.info("[ServiceConfig] R2: 数据库配置")
    if (_redis) logger.system.info("[ServiceConfig] Redis: 数据库配置")
    if (_resend) logger.system.info("[ServiceConfig] Resend: 数据库配置")
  } catch {
    logger.system.warn("[ServiceConfig] 数据库读取失败，使用环境变量")
    _dbReady = true // 标记完成，不再重试
  }

  // DB 未配置的服务 → env fallback
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
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = process.env.RESEND_API_KEY
    logger.system.info("[ServiceConfig] Resend: 环境变量")
  }

  if (!_r2) logger.system.info("[ServiceConfig] R2: 未配置（使用本地存储）")
  if (!_redis) logger.system.info("[ServiceConfig] Redis: 未配置（使用内存缓存）")
  if (!_resend) logger.system.info("[ServiceConfig] Resend: 未配置（邮件功能不可用）")
}

/** 等待 DB 配置加载完成（可选调用，确保使用 DB 配置） */
export function waitForServiceConfig(): Promise<void> {
  return _initPromise
}

/** 同步获取 R2 配置 */
export function getR2Config(): R2Config | null { return _r2 }

/** 同步获取 Redis 配置 */
export function getRedisConfig(): RedisConfig | null { return _redis }

/** 同步获取 Resend API Key */
export function getResendApiKey(): string | null { return _resend }
