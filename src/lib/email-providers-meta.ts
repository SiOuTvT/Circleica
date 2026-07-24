/**
 * 邮件服务商元数据（纯客户端常量）
 *
 * 从 email-providers.ts 抽离，原因：
 * email-providers.ts 内含 SMTP 实现（require("net") / require("tls") 等 Node 内置模块），
 * 若被客户端组件直接 import，Next 16 / Turbopack 会把它打进浏览器 bundle 并报
 * "Module not found: Can't resolve 'net'/'tls'"。
 * 这里只放 Admin UI 动态渲染表单所需的纯数据，无任何 Node 依赖，可安全进入客户端包。
 */

import { EMAIL } from "@/lib/config"

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
    { key: "fromName", label: "发件人名称", type: "text", placeholder: "Circleica", required: false },
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
    { key: "fromName", label: "发件人名称", type: "text", placeholder: "Circleica", required: false },
    { key: "fromEmail", label: "发件邮箱", type: "text", placeholder: EMAIL.DEFAULT_FROM_EMAIL, required: false },
  ],
  smtp: [
    { key: "host", label: "SMTP 主机", type: "text", placeholder: "smtp.example.com", required: true },
    { key: "port", label: "端口", type: "number", placeholder: "587", required: true },
    { key: "username", label: "用户名", type: "text", placeholder: "user@example.com", required: true },
    { key: "password", label: "密码", type: "secret", placeholder: "••••••", required: true },
    { key: "fromName", label: "发件人名称", type: "text", placeholder: "Circleica", required: false },
    { key: "fromEmail", label: "发件邮箱", type: "text", placeholder: EMAIL.DEFAULT_FROM_EMAIL, required: false },
  ],
}

/** 所有已注册的 provider label 映射 */
export const PROVIDER_LABELS: Record<string, string> = {
  resend: "Resend",
  brevo: "Brevo",
  smtp: "通用 SMTP",
}
