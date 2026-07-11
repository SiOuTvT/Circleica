import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings"
import { ValidationError } from "@/lib/errors"

const SERVICE_KEYS = [
  "r2_account_id", "r2_access_key_id", "r2_secret_access_key",
  "r2_bucket_name", "r2_public_url",
  "redis_url", "redis_token",
  "resend_api_key",
]

// GET — 读取服务配置
export const GET = withHandler(async () => {
  await requireAdminRole("SUPER_ADMIN")
  const all = await getSiteSettings()
  console.log("[Services API] all keys:", Object.keys(all).join(", "))
  const config: Record<string, string> = {}
  for (const key of SERVICE_KEYS) {
    config[key] = all[key] || ""
  }
  console.log("[Services API] config:", JSON.stringify(config))
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
  throw new ValidationError("不支持的服务类型")
}

async function testR2(config: Record<string, string>) {
  const { S3Client, ListBucketsCommand } = await import("@aws-sdk/client-s3")
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.account_id}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.access_key_id,
      secretAccessKey: config.secret_access_key,
    },
  })
  await client.send(new ListBucketsCommand({}))
  return { success: true, message: "R2 连接成功" }
}

async function testRedis(config: Record<string, string>) {
  const res = await fetch(`${config.url}/ping`, {
    headers: { Authorization: `Bearer ${config.token}` },
    signal: AbortSignal.timeout(5000),
  })
  const text = await res.text()
  if (res.ok && text.includes("PONG")) {
    return { success: true, message: "Redis 连接成功" }
  }
  return { success: false, message: `Redis 响应异常: ${text}` }
}

async function testEmail(config: Record<string, string>) {
  if (!config.api_key) throw new ValidationError("请先填写 Resend API Key")
  if (!config.to) throw new ValidationError("请输入测试收件邮箱")

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: config.to,
      subject: "Fangame 邮件服务测试",
      html: "<p>如果你收到这封邮件，说明 Resend 邮件服务配置正确。</p>",
    }),
  })

  if (res.ok) return { success: true, message: `测试邮件已发送至 ${config.to}` }
  const body = await res.text()
  return { success: false, message: `发送失败 (${res.status}): ${body}` }
}
