import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"
import { PROVIDER_MAP, PROVIDER_LABELS } from "@/lib/email-providers"
import { emailProviderConfigSchema } from "@/lib/validations"

// 非 email 的服务 key（R2/Redis 保持平铺 key 不变）
const SERVICE_KEYS = [
  "r2_account_id", "r2_access_key_id", "r2_secret_access_key",
  "r2_bucket_name", "r2_public_url",
  "redis_url", "redis_token",
]

// email provider 的 DB key 前缀
const EMAIL_PROVIDER_KEY_PREFIX = "email_provider_"

// secret 字段名（GET 返回时脱敏）
const SECRET_FIELDS = new Set(["apiKey", "password"])

// GET — 读取服务配置
export const GET = withHandler(async () => {
  await requireAdminRole("SUPER_ADMIN")
  const all = await getSiteSettings()

  // R2 / Redis（平铺 key，直接返回）
  const config: Record<string, string> = {}
  for (const key of SERVICE_KEYS) {
    config[key] = all[key] || ""
  }

  // Email providers（JSON key，脱敏后返回）
  const emailProviders: Record<string, Record<string, string>> = {}
  for (const key of Object.keys(all)) {
    if (key.startsWith(EMAIL_PROVIDER_KEY_PREFIX) && key !== "email_provider_order") {
      const providerId = key.slice(EMAIL_PROVIDER_KEY_PREFIX.length)
      try {
        const parsed = JSON.parse(all[key])
        if (typeof parsed === "object" && parsed !== null) {
          emailProviders[providerId] = maskSecrets(parsed as Record<string, string>)
        }
      } catch {
        // 忽略解析失败的 key
      }
    }
  }

  // 优先级顺序
  const emailProviderOrder = all.email_provider_order || ""

  return json({
    ...config,
    email_providers: emailProviders,
    email_provider_order: emailProviderOrder,
  })
})

// POST — 保存配置 或 测试连接
export const POST = withHandler(async (req) => {
  await requireAdminRole("SUPER_ADMIN")
  const body = await req.json()

  if (body.action === "test") {
    return json(await testConnection(body.service, body.config))
  }

  // 保存
  const toSave: Record<string, string> = {}

  // R2 / Redis（平铺 key）
  for (const key of SERVICE_KEYS) {
    if (key in body) toSave[key] = String(body[key] || "")
  }

  // Email providers（JSON key）
  if (body.email_providers && typeof body.email_providers === "object") {
    for (const [providerId, providerConfig] of Object.entries(body.email_providers)) {
      if (typeof providerConfig !== "object" || providerConfig === null) continue

      // Zod 校验单个 provider
      const result = emailProviderConfigSchema.safeParse({
        provider: providerId,
        config: providerConfig,
      })
      if (!result.success) {
        return json({
          success: false,
          message: `${PROVIDER_LABELS[providerId] || providerId} 配置校验失败: ${result.error.issues.map(i => i.message).join("; ")}`,
        })
      }

      // 空 secret 字段 = "不修改"（保留旧值）
      const cleaned = stripEmptySecrets(result.data.config as Record<string, string>)

      // 如果清理后没有有效配置，跳过（删除该 provider）
      const dbKey = `${EMAIL_PROVIDER_KEY_PREFIX}${providerId}`
      if (Object.keys(cleaned).length === 0) {
        // 显式删除：存空字符串
        toSave[dbKey] = ""
      } else {
        toSave[dbKey] = JSON.stringify(cleaned)
      }
    }
  }

  // Email provider order
  if ("email_provider_order" in body) {
    toSave.email_provider_order = String(body.email_provider_order || "")
  }

  await updateSiteSettings(toSave)
  return json({ success: true })
})

/* ── 工具函数 ── */

/** 脱敏 secret 字段：保留前 4 后 4，中间用 * 替代 */
function maskSecrets(config: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {}
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_FIELDS.has(key) && typeof value === "string" && value.length > 8) {
      masked[key] = value.slice(0, 4) + "*".repeat(Math.min(value.length - 8, 20)) + value.slice(-4)
    } else if (SECRET_FIELDS.has(key) && value) {
      masked[key] = "****"
    } else {
      masked[key] = value
    }
  }
  return masked
}

/**
 * 移除空 secret 字段（空字符串 = "不修改"）
 * 非 secret 的空字段保留（允许清空 fromName 等）
 */
function stripEmptySecrets(config: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_FIELDS.has(key) && !value) {
      continue // 跳过空 secret（保留旧值）
    }
    result[key] = value
  }
  return result
}

/* ── 连接测试 ── */

async function testConnection(service: string, config: Record<string, string>) {
  if (service === "r2") return testR2(config)
  if (service === "redis") return testRedis(config)
  if (service === "email") return testEmail(config)
  return { success: false, message: "不支持的服务类型" }
}

async function testR2(config: Record<string, string>) {
  if (!config.account_id) return { success: false, message: "请填写 Account ID" }
  if (!config.access_key_id || !config.secret_access_key) return { success: false, message: "请填写 Access Key ID 和 Secret Access Key" }
  try {
    const { S3Client, ListBucketsCommand } = await import("@aws-sdk/client-s3")
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${config.account_id}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.access_key_id, secretAccessKey: config.secret_access_key },
    })
    await client.send(new ListBucketsCommand({}))
    return { success: true, message: "R2 连接成功，凭证有效" }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("InvalidAccessKeyId")) return { success: false, message: "Access Key ID 无效" }
    if (msg.includes("SignatureDoesNotMatch")) return { success: false, message: "Secret Access Key 不正确" }
    if (msg.includes("NoSuchBucket") || msg.includes("NotFound")) return { success: false, message: "Account ID 或 Bucket 不存在" }
    if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) return { success: false, message: "网络连接失败，请检查 Account ID 是否正确" }
    return { success: false, message: `R2 错误: ${msg}` }
  }
}

async function testRedis(config: Record<string, string>) {
  if (!config.url) return { success: false, message: "请填写 REST URL" }
  if (!config.token) return { success: false, message: "请填写 REST Token" }
  try {
    const res = await fetch(`${config.url}/ping`, {
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(5000),
    })
    const text = await res.text()
    if (res.ok && text.includes("PONG")) return { success: true, message: "Redis 连接成功，响应 PONG" }
    if (res.status === 401 || res.status === 403) return { success: false, message: `Redis 认证失败 (${res.status}): Token 无效或已过期` }
    return { success: false, message: `Redis 响应异常 (${res.status}): ${text}` }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("TimeoutError") || msg.includes("timeout")) return { success: false, message: "Redis 连接超时，请检查 URL 是否正确" }
    if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) return { success: false, message: "无法解析 Redis 地址，请检查 URL" }
    return { success: false, message: `Redis 错误: ${msg}` }
  }
}

/**
 * 测试邮件发送
 * config.to — 收件邮箱
 * config.email_providers — JSON 字符串，每个 provider 的配置
 * config.email_provider_order — 优先级顺序
 */
async function testEmail(config: Record<string, string>) {
  if (!config.to) return { success: false, message: "请输入测试收件邮箱" }

  // 从请求体解析 provider 配置
  const providers: Array<{ id: string; config: Record<string, string> }> = []
  try {
    if (config.email_providers) {
      const parsed = JSON.parse(config.email_providers)
      if (typeof parsed === "object" && parsed !== null) {
        const order = config.email_provider_order
          ? config.email_provider_order.split(",").map(s => s.trim()).filter(Boolean)
          : Object.keys(parsed)

        for (const id of order) {
          const providerConfig = (parsed as Record<string, Record<string, string>>)[id]
          if (providerConfig && typeof providerConfig === "object") {
            // 脱敏的 key（含 *）跳过，使用 DB 中的真实值
            const hasRealKey = Object.values(providerConfig).some(v => typeof v === "string" && !v.includes("*"))
            if (hasRealKey) {
              providers.push({ id, config: providerConfig })
            }
          }
        }
      }
    }
  } catch {
    return { success: false, message: "邮件配置解析失败" }
  }

  if (!providers.length) {
    return { success: false, message: "请至少配置一个邮件服务商" }
  }

  const results: Array<{ provider: string; label: string; ok: boolean; msg: string }> = []

  for (const p of providers) {
    const impl = PROVIDER_MAP[p.id]
    if (!impl) continue

    // 构建 from 地址（从 provider config 中取）
    const fromName = p.config.fromName || "Fangame"
    const fromEmail = p.config.fromEmail || "noreply@example.com"
    const from = `${fromName} <${fromEmail}>`

    const result = await impl.send(p.config, { from, to: config.to, subject: "Fangame 邮件服务测试", html: testHtml(impl.label) })
    results.push({
      provider: p.id,
      label: impl.label,
      ok: result.ok,
      msg: result.ok ? `测试邮件已发送${result.id ? ` (ID: ${result.id})` : ""}，请检查收件箱` : result.error,
    })
  }

  const allOk = results.every(r => r.ok)
  const message = results.map(r => `${r.label}: ${r.ok ? "✓ 成功" : `✗ ${r.msg}`}`).join(" | ")

  return { success: allOk, message, results }
}

function testHtml(label: string): string {
  return `<p>如果你收到这封邮件，说明 ${label} 邮件服务配置正确。</p>`
}
