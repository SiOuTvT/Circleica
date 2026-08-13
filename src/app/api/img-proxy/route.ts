import { NextResponse } from "next/server"
import dns from "node:dns/promises"
import net from "node:net"

/**
 * 图片 CORS 代理
 *
 * 用途：外部图源（如 t.vndb.org）不带 `Access-Control-Allow-Origin` 头，
 *       html2canvas 等 Canvas 读取跨域图片时会失败（CORS taint）。
 *       本端点把外部图片拉回本站并以同源响应返回，附 CORS 头，供名片截图使用。
 *
 * 安全（P3-3 加固）：
 *  - 仅允许白名单域名，防开放代理滥用
 *  - 限制单图大小（默认 20MB），防内存爆炸
 *  - 校验 Content-Type 为图片类型
 *  - **手动跟随重定向**：`redirect` 设为 `manual`，每一跳都重新校验协议 + 域名白名单，
 *    杜绝「初始白名单域名 302 跳转到内网地址」的 SSRF 绕过（原 `redirect:"follow"` 只校验首跳）
 *  - **DNS 重绑定防护**：每次请求解析目标主机名，拒绝任何解析到私有/环回/链路本地地址的记录
 */
export const runtime = "nodejs"

// 允许代理的图片域（与 next.config remotePatterns / CSP img-src 保持同步）
const ALLOWED_HOSTS = new Set([
  "t.vndb.org",
  "static.vndb.org",
  "s.vndb.org",
  "utfs.io",
  "uploadthing.com",
  "shared.cdn.queniuqe.com",
  "media.st.dl.eccdnx.com",
  // R2 桶（*.r2.dev）
])

const MAX_BYTES = 20 * 1024 * 1024 // 20MB
const MAX_REDIRECTS = 5
const FETCH_TIMEOUT_MS = 15_000

function isAllowedHost(hostname: string): boolean {
  if (ALLOWED_HOSTS.has(hostname)) return true
  // *.r2.dev / *.r2.cloudflarestorage.com
  if (hostname.endsWith(".r2.dev")) return true
  if (hostname.endsWith(".r2.cloudflarestorage.com")) return true
  return false
}

/** DNS 重绑定防护：判断一个 IP 是否为私有/环回/链路本地/保留地址 */
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number)
    if (a === 10) return true // 10.0.0.0/8
    if (a === 127) return true // 环回
    if (a === 169 && b === 254) return true // 链路本地 169.254.0.0/16（云元数据）
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 0) return true // 0.0.0.0/8
    if (a >= 224) return true // 组播/保留
    return false
  }
  const v = ip.toLowerCase()
  if (v === "::1" || v === "::") return true
  if (v.startsWith("fe80")) return true // 链路本地
  if (v.startsWith("fc") || v.startsWith("fd")) return true // 唯一本地
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice("::ffff:".length)) // IPv4 映射
  return false
}

/** 解析主机名并断言其所有记录均为公网地址（否则视为 DNS 重绑定攻击） */
async function assertPublicHost(hostname: string): Promise<void> {
  let records: { address: string }[]
  try {
    records = await dns.lookup(hostname, { all: true })
  } catch {
    throw new Error("dns-resolve-failed")
  }
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error("private-ip")
  }
}

/**
 * 手动跟随重定向：每一跳都重新校验 协议 + 白名单域名 + DNS 重绑定，
 * 命中内网/非白名单即中止，杜绝 SSRF。
 */
async function fetchWithRedirectGuard(
  initial: URL,
): Promise<{ res: Response; finalUrl: URL }> {
  let current = initial
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "https:" && current.protocol !== "http:") {
      throw new Error("bad-protocol")
    }
    if (!isAllowedHost(current.hostname)) {
      throw new Error("host-not-allowed")
    }
    await assertPublicHost(current.hostname)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(current.toString(), {
        headers: {
          "User-Agent": "Circleica-ImageProxy/1.0",
          "Accept": "image/*",
        },
        // 关键：关闭自动跟随，由本函数逐跳校验
        redirect: "manual",
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location")
      if (!loc) throw new Error("redirect-no-location")
      // 以当前 URL 为基解析相对地址（含协议相对 //host 形式）
      current = new URL(loc, current)
      continue
    }
    return { res, finalUrl: current }
  }
  throw new Error("too-many-redirects")
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const target = url.searchParams.get("url")

  if (!target) {
    return new Response("缺少 url 参数", { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return new Response("非法 url", { status: 400 })
  }

  try {
    const { res, finalUrl } = await fetchWithRedirectGuard(parsed)

    if (!res.ok) {
      return new Response("上游拉取失败", { status: res.status })
    }

    // 校验 Content-Type 是图片
    const contentType = res.headers.get("content-type") || ""
    if (!contentType.startsWith("image/")) {
      return new Response("非图片内容", { status: 415 })
    }

    // 限制大小（防内存爆炸）
    const contentLength = Number(res.headers.get("content-length") || 0)
    if (contentLength > MAX_BYTES) {
      return new Response("图片过大", { status: 413 })
    }

    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) {
      return new Response("图片过大", { status: 413 })
    }

    // 以同源响应返回，附 CORS 头（关键：让 html2canvas 可读取）
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
        "X-Proxy-Source": finalUrl.origin,
      },
    })
  } catch {
    // 上游超时 / DNS 重绑定 / 跳转到非白名单 / 解析失败 等统一返回 502
    return new Response("代理失败", { status: 502 })
  }
}
