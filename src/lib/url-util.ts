/**
 * 纯函数 URL 协议校验（无 zod 依赖，便于测试与复用）。
 *
 * 仅允许 http: / https: 绝对协议；可选允许同源相对路径（以 / 开头）。
 * 拒绝 javascript: / data: / file: / ftp: 等危险或无关协议，避免协议注入 / 存储型 XSS。
 *
 * zod 校验器见 ./url.ts（httpUrl / httpOrRelativeUrl）。
 */

export const HTTP_PROTOCOLS = ["http:", "https:"] as const

/** 是否为 http/https 绝对 URL（不含相对路径）。 */
export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    const u = new URL(value)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

/** http/https 绝对 URL，或以 / 开头的同源相对路径。 */
export function isHttpOrRelativeUrl(value: string | null | undefined): boolean {
  if (!value) return false
  if (value.startsWith("/")) return true
  return isHttpUrl(value)
}
