import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"

const SERVICE_KEYS = [
  "r2_account_id", "r2_access_key_id", "r2_secret_access_key",
  "r2_bucket_name", "r2_public_url",
  "redis_url", "redis_token",
  "resend_api_key", "email_from_name", "email_from_email",
]

// GET — 读取服务配置
export const GET = withHandler(async () => {
  await requireAdminRole("SUPER_ADMIN")
  const all = await getSiteSettings()
  const config: Record<string, string> = {}
  for (const key of SERVICE_KEYS) {
    config[key] = all[key] || ""
  }
  return json(config)
})

// POST — 保存配置 或 测试连接
export const POST = withHandler(async (req) => {
  await requireAdminRole("SUPER_ADMIN")
  const body = await req.json()

  if (body.action === "test") {
    return json(await testConnection(body.service, body.config))
  }

  // 保存：只允许白名单内的 key
  const filtered: Record<string, string> = {}
  for (const key of SERVICE_KEYS) {
    if (key in body) filtered[key] = String(body[key] || "")
  }
  await updateSiteSettings(filtered)
  return json({ success: true })
})

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
  } catch (e: any) {
    const msg = e?.message || String(e)
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
    if (res.ok && text.includes("PONG")) {
      return { success: true, message: "Redis 连接成功，响应 PONG" }
    }
    if (res.status === 401 || res.status === 403) return { success: false, message: `Redis 认证失败 (${res.status}): Token 无效或已过期` }
    return { success: false, message: `Redis 响应异常 (${res.status}): ${text}` }
  } catch (e: any) {
    if (e?.name === "TimeoutError" || e?.message?.includes("timeout")) return { success: false, message: "Redis 连接超时，请检查 URL 是否正确" }
    if (e?.message?.includes("fetch failed") || e?.message?.includes("ENOTFOUND")) return { success: false, message: "无法解析 Redis 地址，请检查 URL" }
    return { success: false, message: `Redis 错误: ${e?.message || String(e)}` }
  }
}

async function testEmail(config: Record<string, string>) {
  if (!config.api_key) return { success: false, message: "请先填写 Resend API Key" }
  if (!config.to) return { success: false, message: "请输入测试收件邮箱" }

  const fromName = config.from_name || "Fangame"
  const fromEmail = config.from_email || "noreply@example.com"
  const from = `${fromName} <${fromEmail}>`

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: config.to,
        subject: "Fangame 邮件服务测试",
        html: "<p>如果你收到这封邮件，说明 Resend 邮件服务配置正确。</p>",
      }),
    })

    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      const msgId = data?.id ? ` (ID: ${data.id})` : ""
      return { success: true, message: `测试邮件已发送至 ${config.to}，请检查收件箱${msgId}` }
    }

    const err = await res.text()
    if (res.status === 401) return { success: false, message: "API Key 无效，请检查 Resend 控制台" }
    if (res.status === 403) return { success: false, message: "发件域名未验证，请在 Resend 控制台验证域名" }
    if (res.status === 422) return { success: false, message: `收件邮箱格式错误或被拒绝: ${err}` }
    return { success: false, message: `Resend 错误 (${res.status}): ${err}` }
  } catch (e: any) {
    if (e?.name === "TimeoutError") return { success: false, message: "Resend API 连接超时" }
    if (e?.message?.includes("fetch failed") || e?.message?.includes("ENOTFOUND")) return { success: false, message: "无法连接 Resend API，请检查网络" }
    return { success: false, message: `发送异常: ${e?.message || String(e)}` }
  }
}
