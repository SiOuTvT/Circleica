import dns from "node:dns/promises"
import net from "node:net"
import { isHttpUrl } from "@/lib/url-util"

/**
 * SSRF 防护守卫（SEC-C）。
 * 用于服务端代发请求前的 URL 安全校验：
 *  - 仅允许 http/https（拒绝 file:/gopher:/javascript: 等伪协议）；
 *  - DNS 解析后逐 IP 校验，阻断链路本地 / 云元数据地址（169.254.0.0/16、fe80::/10、::1）；
 *  - 允许回环与 RFC1918 / ULA 私网（运维自有 Redis / R2 等自托管服务，需超管权限）；
 *  - 解析失败时按 hostname 关键字兜底拦截已知云元数据域名。
 * 注意：DNS 重绑定防护依赖调用方在解析后、fetch 前不做二次解析；本守卫解析一次并锁定校验。
 */

/** 是否为链路本地 / 云元数据地址（高危 SSRF 目标）。 */
export function isLinkLocalOrMetadataIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number)
    if (a === 169 && b === 254) return true // 169.254.0.0/16 链路本地 / 云元数据
    return false
  }
  const v = ip.toLowerCase().replace(/^::ffff:/, "")
  if (net.isIPv4(v)) {
    const [a, b] = v.split(".").map(Number)
    return a === 169 && b === 254
  }
  if (v === "::1") return true
  if (v.startsWith("fe80")) return true // fe80::/10 链路本地
  return false
}

const DANGEROUS_HOSTNAMES = ["169.254.169.254", "metadata.google.internal", "metadata.google"]

export function isDangerousHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return DANGEROUS_HOSTNAMES.includes(h)
}

export class SsrfBlockedError extends Error {
  constructor(message = "禁止访问受保护的保留地址 (SSRF)") {
    super(message)
    this.name = "SsrfBlockedError"
  }
}

/**
 * 校验一个将被服务端代发的 URL 是否安全。通过则返回解析后的 URL，否则抛 SsrfBlockedError。
 */
export async function assertSafeHttpUrl(target: string): Promise<URL> {
  if (!isHttpUrl(target)) {
    throw new SsrfBlockedError("URL 必须是 http 或 https 地址")
  }
  const url = new URL(target)

  if (isDangerousHostname(url.hostname)) {
    throw new SsrfBlockedError()
  }

  let addresses: { address: string }[] = []
  try {
    addresses = await dns.lookup(url.hostname, { all: true })
  } catch {
    // 无法解析（内网主机名等）；hostname 关键字已在上面兜底，未命中则放行由调用方决定是否可达。
    return url
  }

  for (const { address } of addresses) {
    if (isLinkLocalOrMetadataIp(address)) {
      throw new SsrfBlockedError()
    }
  }
  return url
}
