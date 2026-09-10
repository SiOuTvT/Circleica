import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { getSiteSettings, getSiteSetting, updateSiteSettings } from "@/lib/site-settings"
import { reloadServiceConfig } from "@/lib/service-config"
import { PROVIDER_MAP, PROVIDER_LABELS } from "@/lib/email-providers"
import { emailProviderConfigSchema } from "@/lib/validations"
import { EMAIL } from "@/lib/config"
import { assertSafeHttpUrl, SsrfBlockedError } from "@/lib/ssrf"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import { ValidationError } from "@/lib/errors"

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

// 「只写」字段：GET 一律回传空串（密钥不落前端，见下方 GET 处理），
// 因此保存时收到的空串代表「用户没动这个框」而不是「要清空」。
// 若照原样写库，管理员第二次改任何一项都会把上一次填好的密钥抹掉。
// 其余四个非密钥字段（r2_account_id / r2_bucket_name / r2_public_url / redis_url）保持可清空。
const WRITE_ONLY_KEYS = new Set(["r2_access_key_id", "r2_secret_access_key", "redis_token"])

// maskSecrets 产出的脱敏占位串形如 abcd****wxyz（含连续四个及以上星号）。
// 前端会把 GET 拿到的这份值原样提交回来，写库就等于把真密码替换成星号串。
const MASKED_SECRET_RE = /\*{4,}/

// GET — 读取服务配置
export const GET = withHandler(async () => {
  await requireAdminRole("SUPER_ADMIN")
  const all = await getSiteSettings()

  // R2 / Redis（平铺 key，直接返回）
  const config: Record<string, string> = {}
  for (const key of SERVICE_KEYS) {
    config[key] = all[key] || ""
  }

  // R2 / Redis 凭证为「只写」字段：GET 绝不回传真实值，避免 Secret Key / Access Key /
  // Token 泄露到浏览器（XSS / 扩展 / 网络面板均可读取）。客户端以空白占位，
  // 仅在管理员主动修改时才需重新填写 —— 与 admin 页面的 write-only 设计一致。
  config.r2_secret_access_key = ""
  config.r2_access_key_id = ""
  config.redis_token = ""

  // 只回「是否已配置」的布尔：这三个字段之所以回空串就是为了不外泄，
  // 因此这里绝不能带值本身、长度、前缀或掩码串。
  const configuredFlags: Record<string, boolean> = {}
  for (const key of WRITE_ONLY_KEYS) {
    configuredFlags[`${key}_configured`] = !!(all[key] || "").trim()
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
    ...configuredFlags,
    email_providers: emailProviders,
    email_provider_order: emailProviderOrder,
  })
})

// POST — 保存配置 或 测试连接
export const POST = withHandler(async (req) => {
  await requireAdminRole("SUPER_ADMIN")
  const body = await safeParseJson(req)

  // action 显式白名单：不做 toLowerCase/trim，拼写错误要 422 报出来。
  // 不带 action 与 action:"save" 都走保存分支（前端不用改）；其它任何值一律拒绝，
  // 否则 "Test" / "test " 会静默落到保存，触发 reloadServiceConfig 与空审计。
  const action = body.action
  if (action !== undefined && action !== null && action !== "test" && action !== "save") {
    throw new ValidationError("action 只能是 test 或 save")
  }

  if (action === "test") {
    return json(await testConnection(body.service, body.config))
  }

  // 保存
  const toSave: Record<string, string> = {}

  // 一次批量读取，供「空值要不要建键」判断（不按字段各查一次库）
  const existing = await getSiteSettings()

  // R2 / Redis（平铺 key）
  for (const key of SERVICE_KEYS) {
    if (!(key in body)) continue
    let value = body[key] == null ? "" : String(body[key])
    // 只写字段：留空 = 不修改，跳过不写（保留库里已有的密钥）
    if (WRITE_ONLY_KEYS.has(key) && !value.trim()) continue
    if (!value.trim()) {
      // 提交空值：库里已有该 key → 写入空串（管理员主动清空，语义保留）；
      // 库里没有 → 跳过，不为「空」凭空建一行。
      if (existing[key] === undefined) continue
      value = ""
    }
    toSave[key] = value
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

      const dbKey = `${EMAIL_PROVIDER_KEY_PREFIX}${providerId}`

      // 剔除掩码「之前」的字段数：0 才是用户显式清空该 provider（删除能力保留）；
      // >0 而剔除后为空，只说明密钥没动（GET 回传的是掩码），绝不能当成要删除。
      const rawCount = Object.keys(providerConfig as Record<string, unknown>).length
      if (rawCount === 0) {
        // 显式删除：存空字符串
        toSave[dbKey] = ""
        continue
      }

      // 空 secret 字段 / 掩码串 = "不修改"（保留旧值）
      const cleaned = stripEmptySecrets(result.data.config as Record<string, string>)

      // 把提交里缺失、或被当作「不修改」剔掉的字段，从库里旧值回填。
      // 只读这一个 key，不整表回读（保存分支此前没有现成的 settings 快照可用）。
      const submitted = providerConfig as Record<string, unknown>
      let prev: Record<string, string> | null = null
      try {
        const raw = await getSiteSetting(dbKey)
        if (raw) {
          const parsed: unknown = JSON.parse(raw)
          if (typeof parsed === "object" && parsed !== null) prev = parsed as Record<string, string>
        }
      } catch {
        prev = null // 不存在或历史脏数据 → 按「无旧值」处理
      }

      if (prev) {
        for (const [k, v] of Object.entries(prev)) {
          if (cleaned[k]) continue // 用户显式给了非空值
          const sv = submitted[k]
          // 提交里没这个字段 → 保持原值；留空或提交掩码的敏感字段 → 同样保持原值。
          // 非敏感字段显式提交空串是「清空」，不回填（见 stripEmptySecrets 注释）。
          if (!(k in submitted) || (typeof sv === "string" && (SECRET_FIELDS.has(k) || MASKED_SECRET_RE.test(sv)))) {
            cleaned[k] = v
          }
        }
      }

      // 回填后仍为空：库里本来就没这份配置，一个字节都不要写
      if (Object.keys(cleaned).length === 0) continue

      toSave[dbKey] = JSON.stringify(cleaned)
    }
  }

  // Email provider order（同「别为空建键」口径：库里没有且提交为空时不建行）
  if ("email_provider_order" in body) {
    const order = String(body.email_provider_order || "")
    if (order.trim() || existing.email_provider_order !== undefined) {
      toSave.email_provider_order = order
    }
  }

  // SEC-C SSRF 双重校验（权限已在路由层 SUPER_ADMIN 门控）+ URL 层：
  // 保存前对外部服务 URL（Redis / R2 公网地址）做协议白名单 + 链路本地/云元数据阻断。
  for (const key of ["redis_url", "r2_public_url"]) {
    const value = toSave[key]
    if (value && typeof value === "string" && value.trim()) {
      try {
        await assertSafeHttpUrl(value.trim())
      } catch (e: unknown) {
        if (e instanceof SsrfBlockedError) {
          return json({ success: false, message: `${key} 不被允许（禁止保存内部保留地址）` })
        }
        return json({ success: false, message: `${key} 必须是合法的 http 或 https 地址` })
      }
    }
  }

  // 没有任何配置变化时不写库、也不热重载全局配置（审计照常留痕）
  const hasChanges = Object.keys(toSave).length > 0
  let reloadFailed = false

  if (hasChanges) {
    await updateSiteSettings(toSave)

    // 记录管理操作审计日志（运维自有服务配置变更）。
    // 位置刻意放在写库之后、热重载之前：reload 抛错时库其实已经保存，
    // 若审计排在后面就会「库已写 + 接口 500 + 审计缺失」。
    void logAudit({
      userId: "SYSTEM",
      action: "ADMIN_SERVICE_CONFIG_SAVE",
      target: body.service || "services",
      detail: `keys=${Object.keys(toSave).filter(k => !SECRET_FIELDS.has(k)).join(",")}`,
    }).catch(e => logger.system.error("[Audit] 审计日志写入失败", e))

    // 热重载失败不该让整个保存变成 500：库已经写成功，只是内存配置没跟上
    try {
      await reloadServiceConfig()
    } catch (e) {
      reloadFailed = true
      logger.system.error("[ServiceConfig] 配置热重载失败，需重启应用后生效", e)
    }
  } else {
    // 无变化：不写库、不重载，审计照常留痕
    void logAudit({
      userId: "SYSTEM",
      action: "ADMIN_SERVICE_CONFIG_SAVE",
      target: body.service || "services",
      detail: "keys=无变化",
    }).catch(e => logger.system.error("[Audit] 审计日志写入失败", e))
  }

  return json(reloadFailed
    ? { success: true, message: "配置已保存，但热重载失败，请重启应用后生效" }
    : { success: true })
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
 * 移除「未修改」的 secret 字段（保留旧值）
 * - 空字符串 = 没填，视为不修改
 * - 脱敏占位串（abcd****wxyz）= 前端把 GET 的掩码原样提交了回来，同样视为不修改
 * 非 secret 的空字段保留（允许清空 fromName 等）
 */
function stripEmptySecrets(config: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_FIELDS.has(key) && (!value || MASKED_SECRET_RE.test(value))) {
      continue // 跳过空 secret 与脱敏串（保留旧值）
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
  // 阻断 account_id 中的分隔符/控制字符，防止突破固定 endpoint host（https://${account_id}.r2.cloudflarestorage.com）。
  if (!/^[A-Za-z0-9_-]+$/.test(config.account_id)) {
    return { success: false, message: "Account ID 格式不合法" }
  }
  if (!config.access_key_id || !config.secret_access_key) return { success: false, message: "请填写 Access Key ID 和 Secret Access Key" }
  if (!config.bucket_name) return { success: false, message: "请填写 Bucket Name" }
  try {
    const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3")
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${config.account_id}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.access_key_id, secretAccessKey: config.secret_access_key },
    })
    await client.send(new HeadBucketCommand({ Bucket: config.bucket_name }))
    return { success: true, message: "R2 连接成功，凭证与 Bucket 有效" }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const code = (e as { name?: string })?.name || ""
    // 把底层错误码（403 权限 / 404 Bucket 不存在 / 网络）带进 message 方便排查
    if (code === "InvalidAccessKeyId") return { success: false, message: "Access Key ID 无效（403）" }
    if (code === "SignatureDoesNotMatch") return { success: false, message: "Secret Access Key 不正确（403）" }
    if (code === "Forbidden" || msg.includes("403")) return { success: false, message: "凭证有效但无该 Bucket 访问权限（403）" }
    if (code === "NotFound" || msg.includes("404") || msg.includes("NoSuchBucket")) return { success: false, message: "Bucket 不存在（404），请检查 Bucket Name" }
    if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) return { success: false, message: "网络连接失败，请检查 Account ID 是否正确（网络错误）" }
    return { success: false, message: `R2 连接失败：${msg.split("\n")[0]}` }
  }
}

async function testRedis(config: Record<string, string>) {
  if (!config.url) return { success: false, message: "请填写 REST URL" }
  if (!config.token) return { success: false, message: "请填写 REST Token" }
  try {
    // SEC-C SSRF 双重校验（权限已在路由层 SUPER_ADMIN 门控）+ URL 层：
    // 仅允许 http/https，并阻断链路本地 / 云元数据地址（如 169.254.169.254）。
    await assertSafeHttpUrl(config.url)
  } catch (e: unknown) {
    if (e instanceof SsrfBlockedError) {
      return { success: false, message: "连接地址不被允许（禁止访问内部保留地址）" }
    }
    return { success: false, message: "Redis REST URL 格式不合法，必须为 http 或 https 地址" }
  }
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
    return { success: false, message: "Redis 连接失败，请检查配置或网络" }
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
    const fromName = p.config.fromName || "Circleica"
    const fromEmail = p.config.fromEmail || EMAIL.DEFAULT_FROM_EMAIL
    const from = `${fromName} <${fromEmail}>`

    const result = await impl.send(p.config, { from, to: config.to, subject: "Circleica 邮件服务测试", html: testHtml(impl.label) })
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
