/**
 * 邮件服务商抽象层
 *
 * 每个 provider 内部负责：
 * - 从 config 对象提取所需字段
 * - Payload 格式转换（扁平 → API 专用结构）
 * - 错误分类（retryable: 429/超时 → true, 401/403/422 → false）
 *
 * 新增 provider 只需：
 * 1. 实现 EmailProvider 接口
 * 2. 注册到 PROVIDER_MAP
 * 3. 在 PROVIDER_FIELDS 中声明配置字段
 */

import { EMAIL } from "@/lib/config"

// ── 类型 ──────────────────────────────

export interface EmailPayload {
  from: string
  to: string
  subject: string
  html: string
}

export type SendResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; retryable: boolean }

export interface EmailProvider {
  id: string
  label: string
  /** 从 provider-specific config 对象中读取所需字段 */
  send: (config: Record<string, string>, payload: EmailPayload) => Promise<SendResult>
}

// ── Provider 字段描述（供 Admin UI 动态渲染）────

export interface ProviderField {
  key: string
  label: string
  type: "text" | "secret" | "number"
  placeholder: string
  required: boolean
  /** 仅当指定 mode 时显示（用于 Brevo API/SMTP 模式切换） */
  showIf?: string
}

export const PROVIDER_FIELDS: Record<string, ProviderField[]> = {
  resend: [
    { key: "apiKey", label: "API Key", type: "secret", placeholder: "re_xxxxxxxxxxxx", required: true },
    { key: "fromName", label: "发件人名称", type: "text", placeholder: "Fangame", required: false },
    { key: "fromEmail", label: "发件邮箱", type: "text", placeholder: EMAIL.DEFAULT_FROM_EMAIL, required: false },
  ],
  brevo: [
    // mode 字段决定使用 API 还是 SMTP Relay
    { key: "mode", label: "连接方式", type: "text", placeholder: "api", required: true },
    // API 模式字段
    { key: "apiKey", label: "API Key", type: "secret", placeholder: "xkeysib-xxxxxxxxxxxx", required: true, showIf: "api" },
    // SMTP Relay 模式字段
    { key: "host", label: "SMTP 主机", type: "text", placeholder: "smtp-relay.brevo.com", required: true, showIf: "smtp" },
    { key: "port", label: "端口", type: "number", placeholder: "587", required: true, showIf: "smtp" },
    { key: "username", label: "登录邮箱", type: "text", placeholder: "your@brevo-account.com", required: true, showIf: "smtp" },
    { key: "password", label: "Master Password", type: "secret", placeholder: "Brevo SMTP 专用密码", required: true, showIf: "smtp" },
    // 共同字段
    { key: "fromName", label: "发件人名称", type: "text", placeholder: "Fangame", required: false },
    { key: "fromEmail", label: "发件邮箱", type: "text", placeholder: EMAIL.DEFAULT_FROM_EMAIL, required: false },
  ],
  smtp: [
    { key: "host", label: "SMTP 主机", type: "text", placeholder: "smtp.example.com", required: true },
    { key: "port", label: "端口", type: "number", placeholder: "587", required: true },
    { key: "username", label: "用户名", type: "text", placeholder: "user@example.com", required: true },
    { key: "password", label: "密码", type: "secret", placeholder: "••••••", required: true },
    { key: "fromName", label: "发件人名称", type: "text", placeholder: "Fangame", required: false },
    { key: "fromEmail", label: "发件邮箱", type: "text", placeholder: EMAIL.DEFAULT_FROM_EMAIL, required: false },
  ],
}

/** 所有已注册的 provider label 映射 */
export const PROVIDER_LABELS: Record<string, string> = {
  resend: "Resend",
  brevo: "Brevo",
  smtp: "通用 SMTP",
}

// ── 工具函数 ──────────────────────────

/** 解析 "Name <email>" 或纯邮箱 → { name, email } */
function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() }
  }
  return { name: "Fangame", email: from.trim() }
}

/** 判断 HTTP 状态码是否可重试（配额/限流/服务端错误） */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

// ── Resend Provider ───────────────────

const resendProvider: EmailProvider = {
  id: "resend",
  label: "Resend",

  async send(config, payload) {
    const apiKey = config.apiKey
    if (!apiKey) return { ok: false, error: "Resend API Key 未配置", retryable: false }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
        }),
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return { ok: true, id: data.id }
      }

      const body = await res.text().catch(() => "")
      const retryable = isRetryableStatus(res.status)

      if (!retryable && body.toLowerCase().includes("quota")) {
        return { ok: false, error: `Resend 配额耗尽 (${res.status})`, retryable: true }
      }

      return { ok: false, error: `Resend (${res.status}): ${body.slice(0, 200)}`, retryable }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, error: `Resend 网络错误: ${msg}`, retryable: true }
    }
  },
}

// ── Brevo Provider（API + SMTP Relay 双模式）────

async function brevoApiSend(config: Record<string, string>, payload: EmailPayload): Promise<SendResult> {
  const apiKey = config.apiKey
  if (!apiKey) return { ok: false, error: "Brevo API Key 未配置", retryable: false }

  const { name, email } = parseFrom(payload.from)

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name, email },
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: payload.html,
      }),
    })

    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: true, id: data.messageId }
    }

    const body = await res.text().catch(() => "")
    const retryable = isRetryableStatus(res.status)

    if (!retryable && body.toLowerCase().includes("quota")) {
      return { ok: false, error: `Brevo 配额耗尽 (${res.status})`, retryable: true }
    }

    return { ok: false, error: `Brevo API (${res.status}): ${body.slice(0, 200)}`, retryable }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `Brevo API 网络错误: ${msg}`, retryable: true }
  }
}

const brevoProvider: EmailProvider = {
  id: "brevo",
  label: "Brevo",

  async send(config, payload) {
    const mode = config.mode || "api"

    if (mode === "smtp") {
      // Brevo SMTP Relay：复用通用 SMTP 发送
      // 默认 host: smtp-relay.brevo.com, port: 587
      return smtpSend({
        host: config.host || "smtp-relay.brevo.com",
        port: config.port || "587",
        username: config.username || "",
        password: config.password || "",
      }, payload)
    }

    return brevoApiSend(config, payload)
  },
}

// ── SMTP Provider ─────────────────────
// 原生 TCP/TLS 实现，不引入外部依赖

const CRLF = "\r\n"

function smtpSend(config: Record<string, string>, payload: EmailPayload): Promise<SendResult> {
  return new Promise((resolve) => {
    const host = config.host
    const port = parseInt(config.port || "587", 10)
    const username = config.username
    const password = config.password

    if (!host || !username || !password) {
      resolve({ ok: false, error: "SMTP 配置不完整（需要 host/username/password）", retryable: false })
      return
    }

    const { name: fromName, email: fromEmail } = parseFrom(payload.from)
    const isImplicitTLS = port === 465

    let socket: import("net").Socket
    let responseBuffer = ""
    let step = 0
    let messageId = ""
    let finished = false

    const finish = (result: SendResult) => {
      if (finished) return
      finished = true
      try { socket.destroy() } catch {}
      resolve(result)
    }

    const send = (data: string) => {
      socket.write(data + CRLF)
    }

    const handleResponse = (line: string) => {
      // 多行响应（220-xxx）等待最后一行
      if (line.length >= 4 && line[3] === "-") return

      const code = parseInt(line.slice(0, 3), 10)

      switch (step) {
        case 0: // 连接成功
          if (code !== 220) { finish({ ok: false, error: `SMTP 连接失败: ${line}`, retryable: true }); return }
          send("EHLO localhost")
          step = 1
          break
        case 1: // EHLO 响应
          if (code !== 250) { finish({ ok: false, error: `SMTP EHLO 失败: ${line}`, retryable: true }); return }
          if (!isImplicitTLS) {
            send("STARTTLS")
            step = 2
          } else {
            send("AUTH LOGIN")
            step = 3
          }
          break
        case 2: // STARTTLS 响应
          if (code !== 220) { finish({ ok: false, error: `SMTP STARTTLS 失败: ${line}`, retryable: true }); return }
          // 升级到 TLS
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const tls = require("tls") as typeof import("tls")
          const tlsSocket = tls.connect({ socket: socket as import("net").Socket, servername: host }, () => {
            socket = tlsSocket as unknown as import("net").Socket
            socket.on("data", onData)
            send("EHLO localhost")
            step = 1
          })
          socket.removeAllListeners("data")
          tlsSocket.on("error", (e: Error) => finish({ ok: false, error: `SMTP TLS 错误: ${e.message}`, retryable: true }))
          return
        case 3: // AUTH LOGIN 响应
          if (code !== 334) { finish({ ok: false, error: `SMTP AUTH 失败: ${line}`, retryable: false }); return }
          send(Buffer.from(username).toString("base64"))
          step = 4
          break
        case 4: // 用户名响应
          if (code !== 334) { finish({ ok: false, error: `SMTP 用户名认证失败: ${line}`, retryable: false }); return }
          send(Buffer.from(password).toString("base64"))
          step = 5
          break
        case 5: // 密码响应
          if (code !== 235) { finish({ ok: false, error: `SMTP 密码认证失败 (${code})`, retryable: false }); return }
          send(`MAIL FROM:<${fromEmail}>`)
          step = 6
          break
        case 6: // MAIL FROM
          if (code !== 250) { finish({ ok: false, error: `SMTP MAIL FROM 失败: ${line}`, retryable: true }); return }
          send(`RCPT TO:<${payload.to}>`)
          step = 7
          break
        case 7: // RCPT TO
          if (code !== 250) { finish({ ok: false, error: `SMTP RCPT TO 失败: ${line}`, retryable: false }); return }
          send("DATA")
          step = 8
          break
        case 8: // DATA
          if (code !== 354) { finish({ ok: false, error: `SMTP DATA 失败: ${line}`, retryable: true }); return }
          const encodedSubject = `=?UTF-8?B?${Buffer.from(payload.subject).toString("base64")}?=`
          const headers = [
            `From: ${fromName} <${fromEmail}>`,
            `To: ${payload.to}`,
            `Subject: ${encodedSubject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=UTF-8`,
            `Content-Transfer-Encoding: base64`,
            `Date: ${new Date().toUTCString()}`,
            `Message-ID: <${Date.now()}@${host}>`,
            "",
            Buffer.from(payload.html).toString("base64"),
          ]
          send(headers.join(CRLF) + CRLF + ".")
          step = 9
          break
        case 9: // 邮件发送完成
          if (code !== 250) { finish({ ok: false, error: `SMTP 发送失败: ${line}`, retryable: true }); return }
          messageId = line
          send("QUIT")
          step = 10
          break
        case 10: // QUIT
          finish({ ok: true, id: messageId || undefined })
          break
      }
    }

    const onData = (data: Buffer) => {
      responseBuffer += data.toString()
      const lines = responseBuffer.split(CRLF)
      responseBuffer = lines.pop() || ""
      for (const line of lines) {
        if (line) handleResponse(line)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const net = require("net") as typeof import("net")
    socket = net.createConnection({ host, port })

    socket.on("data", onData)
    socket.on("error", (e: Error) => finish({ ok: false, error: `SMTP 连接错误: ${e.message}`, retryable: true }))
    socket.on("timeout", () => finish({ ok: false, error: "SMTP 连接超时", retryable: true }))
    socket.setTimeout(15000)
  })
}

const smtpProvider: EmailProvider = {
  id: "smtp",
  label: "SMTP",
  send: (config, payload) => smtpSend(config, payload),
}

// ── Provider 注册表 ───────────────────
// 新增 provider 只需在此处添加一行
export const PROVIDER_MAP: Record<string, EmailProvider> = {
  resend: resendProvider,
  brevo: brevoProvider,
  smtp: smtpProvider,
}

/** 获取所有已注册的 provider ID 列表 */
export function getAvailableProviderIds(): string[] {
  return Object.keys(PROVIDER_MAP)
}
