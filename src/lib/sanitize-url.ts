/**
 * 外部 URL 安全校验（B-13）：入库前的外部链接（VNDB extlinks、社交主页等）统一净化。
 * 拒绝 javascript:/data:/file:/vbscript: 等危险协议，仅允许 http/https。
 * 返回标准化后的 URL 字符串；非法或危险则返回 null，调用方应落空而非原样存储。
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"])

export interface SanitizeUrlOptions {
  /** 额外允许的协议（默认仅 http/https） */
  allowedProtocols?: string[]
  /** 是否要求主机名可通过（默认 false，仅做协议/格式校验） */
  requirePublicHost?: boolean
  /** 解析失败/危险时返回 null（默认 true）。若 false，则抛错。 */
  returnNullOnInvalid?: boolean
}

export function sanitizeExternalUrl(
  input: string | null | undefined,
  options: SanitizeUrlOptions = {},
): string | null {
  if (!input) return null
  const allowed = new Set([...ALLOWED_PROTOCOLS, ...(options.allowedProtocols ?? [])])

  let parsed: URL
  try {
    parsed = new URL(input.trim())
  } catch {
    return options.returnNullOnInvalid === false ? (() => { throw new Error("非法 URL") })() : null
  }

  if (!allowed.has(parsed.protocol)) return null
  // 防御常见绕过：主机名含控制字符或看起来像伪协议
  if (/[\s<>"]/.test(parsed.href)) return null

  return parsed.toString()
}
