/**
 * 安全重定向助手
 *
 * 防止开放重定向（open-redirect）漏洞：仅允许同源的相对路径作为回跳目标，
 * 拒绝协议相对路径（//evil.com）与任意绝对 URL（http://evil.com）。
 * 该逻辑此前内联于 src/app/login/page.tsx，现抽取为可在服务端/客户端复用的纯函数以便单测。
 */

/**
 * @param url 待校验的回跳地址（通常来自 ?callbackUrl=）
 * @param fallback 非法时回退的同源路径，默认 "/"
 * @returns 安全的可信回跳地址
 */
export function safeRedirect(url: string | null | undefined, fallback = "/"): string {
  if (!url || typeof url !== "string") return fallback
  if (url.startsWith("/") && !url.startsWith("//") && !url.includes("://")) {
    return url
  }
  return fallback
}
