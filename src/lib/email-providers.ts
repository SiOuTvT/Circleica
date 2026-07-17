/**
 * 邮件服务商抽象层
 *
 * 每个 provider 内部负责：
 * - Payload 格式转换（扁平 → API 专用结构）
 * - 错误分类（retryable: 429/超时 → true, 401/403/422 → false）
 */

import { logger } from "./logger"

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
  send: (apiKey: string, payload: EmailPayload) => Promise<SendResult>
}

// ── 工具函数 ──────────────────────────

/** 解析 "Name <email>" 或纯邮箱 → { name, email } */
function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() }
  }
  // 兜底：纯邮箱地址，name fallback 为 "Fangame"
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

  async send(apiKey: string, payload: EmailPayload): Promise<SendResult> {
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

      // 尝试从响应体识别 quota exceeded 语义
      if (!retryable && body.toLowerCase().includes("quota")) {
        return { ok: false, error: `Resend 配额耗尽 (${res.status}): ${body}`, retryable: true }
      }

      return { ok: false, error: `Resend (${res.status}): ${body}`, retryable }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, error: `Resend 网络错误: ${msg}`, retryable: true }
    }
  },
}

// ── Brevo Provider ────────────────────

const brevoProvider: EmailProvider = {
  id: "brevo",
  label: "Brevo",

  async send(apiKey: string, payload: EmailPayload): Promise<SendResult> {
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
        return { ok: false, error: `Brevo 配额耗尽 (${res.status}): ${body}`, retryable: true }
      }

      return { ok: false, error: `Brevo (${res.status}): ${body}`, retryable }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, error: `Brevo 网络错误: ${msg}`, retryable: true }
    }
  },
}

// ── Provider 注册表 ───────────────────

export const PROVIDER_MAP: Record<string, EmailProvider> = {
  resend: resendProvider,
  brevo: brevoProvider,
}

/** 获取所有已注册的 provider ID 列表 */
export function getAvailableProviderIds(): string[] {
  return Object.keys(PROVIDER_MAP)
}