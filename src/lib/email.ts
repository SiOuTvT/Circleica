/**
 * 邮件服务 — Resend REST API
 *
 * 配置来源：service-config.ts（数据库 > 环境变量）
 * 未配置时跳过发送，不影响其它功能
 */

import { getResendApiKey, getResendFrom } from "./service-config"
import { logger } from "./logger"

const RESEND_API = "https://api.resend.com/emails"

/**
 * 发送密码重置邮件
 * @returns 是否发送成功
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const apiKey = getResendApiKey()
  if (!apiKey) {
    logger.system.info("[Email] Resend 未配置，跳过邮件发送")
    return false
  }

  const from = getResendFrom()
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "重置你的密码",
        html: [
          "<div style='font-family:sans-serif;max-width:480px;margin:0 auto'>",
          "<h2>密码重置</h2>",
          "<p>你请求了密码重置。点击下方链接设置新密码（链接 1 小时内有效）：</p>",
          `<p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#E0A87C;color:#fff;text-decoration:none;border-radius:8px">重置密码</a></p>`,
          "<p style='color:#888;font-size:13px'>如果这不是你的操作，请忽略此邮件。</p>",
          "</div>",
        ].join(""),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      logger.system.error("[Email] Resend 发送失败", undefined, { status: res.status, body })
      return false
    }

    logger.system.info("[Email] 密码重置邮件已发送", { email: email.replace(/(.{2}).*(@.*)/, "$1***$2") })
    return true
  } catch (e) {
    logger.system.error("[Email] 发送异常", e)
    return false
  }
}
