/**
 * 邮件服务 — 多服务商 fallthrough
 *
 * 配置来源：service-config.ts（数据库 > 环境变量，模块启动时缓存）
 * 按 provider 顺序尝试发送，配额/网络失败自动切下一个
 * 未配置时跳过发送，不影响其它功能
 */

import { getEmailProviders, getEmailFrom } from "./service-config"
import { PROVIDER_MAP } from "./email-providers"
import { logger } from "./logger"

/* ── 通用发送 ──────────────────────── */

/**
 * MVP: 同 provider 不重试。一次超时不代表 provider 挂了，直接切下一个。
 * 后续可加 `maxRetriesPerProvider` 参数让同一个 provider 重试 N 次再 fallthrough。
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const providers = getEmailProviders()
  if (!providers.length) {
    logger.system.info("[Email] 邮件服务未配置，跳过发送")
    return false
  }

  const from = getEmailFrom()

  for (const provider of providers) {
    const impl = PROVIDER_MAP[provider.id]
    if (!impl) {
      logger.system.warn("[Email] 未知 provider", { id: provider.id })
      continue
    }

    const result = await impl.send(provider.apiKey, { from, to, subject, html })

    if (result.ok) {
      logger.system.info("[Email] 邮件已发送", {
        provider: provider.id,
        id: result.id,
        to: to.replace(/(.{2}).*(@.*)/, "$1***$2"),
        subject,
      })
      return true
    }

    logger.system.warn("[Email] provider 发送失败", {
      provider: provider.id,
      error: result.error,
      retryable: result.retryable,
    })

    if (!result.retryable) {
      // 认证失败/配置错误 — 不尝试下一个，直接失败
      return false
    }
    // retryable → 继续下一个 provider
  }

  logger.system.error("[Email] 所有 provider 发送失败", { subject })
  return false
}

/* ── 模板 ──────────────────────────── */

const BTN_STYLE = "display:inline-block;padding:10px 20px;background:#E0A87C;color:#fff;text-decoration:none;border-radius:8px;font-weight:500"
const FOOTER_STYLE = "color:#888;font-size:13px;margin-top:24px"
const WRAPPER = "font-family:sans-serif;max-width:480px;margin:0 auto"

function button(text: string, url: string): string {
  return `<p><a href="${url}" style="${BTN_STYLE}">${text}</a></p>`
}

function footer(note: string): string {
  return `<p style="${FOOTER_STYLE}">${note}</p>`
}

/* ── 邮件函数 ──────────────────────── */

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const url = `${baseUrl}/reset-password?token=${token}`

  return sendEmail(email, "重置你的密码", [
    `<div style="${WRAPPER}">`,
    "<h2>密码重置</h2>",
    "<p>你请求了密码重置。点击下方链接设置新密码（链接 1 小时内有效）：</p>",
    button("重置密码", url),
    footer("如果这不是你的操作，请忽略此邮件。"),
    "</div>",
  ].join(""))
}

/**
 * 发送邮箱验证邮件（注册验证 / 重发验证）
 */
export async function sendVerificationEmail(email: string, token: string, username: string): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const url = `${baseUrl}/verify-email?token=${token}`

  return sendEmail(email, "验证你的邮箱", [
    `<div style="${WRAPPER}">`,
    `<h2>你好，${username}</h2>`,
    "<p>感谢注册！请点击下方链接验证你的邮箱地址（链接 24 小时内有效）：</p>",
    button("验证邮箱", url),
    footer("如果这不是你的操作，请忽略此邮件。"),
    "</div>",
  ].join(""))
}

/**
 * 发送修改邮箱验证邮件
 */
export async function sendEmailChangeEmail(newEmail: string, token: string): Promise<boolean> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const url = `${baseUrl}/verify-email?token=${token}&type=change_email`

  return sendEmail(newEmail, "验证你的新邮箱", [
    `<div style="${WRAPPER}">`,
    "<h2>邮箱变更验证</h2>",
    "<p>你请求将账号邮箱变更为此地址。点击下方链接确认（链接 1 小时内有效）：</p>",
    button("确认邮箱变更", url),
    footer("如果这不是你的操作，请忽略此邮件。你的当前邮箱不受影响。"),
    "</div>",
  ].join(""))
}

/**
 * 发送欢迎邮件
 */
export async function sendWelcomeEmail(email: string, username: string): Promise<boolean> {
  return sendEmail(email, "欢迎加入！", [
    `<div style="${WRAPPER}">`,
    `<h2>欢迎，${username}！</h2>`,
    "<p>你的账号已创建成功。现在可以浏览、收藏、评论同人游戏资源了。</p>",
    footer("如有问题，请联系站点管理员。"),
    "</div>",
  ].join(""))
}
