import { NextResponse } from "next/server"

/**
 * 图片 CORS 代理
 *
 * 用途：外部图源（如 t.vndb.org）不带 `Access-Control-Allow-Origin` 头，
 *       html2canvas 等 Canvas 读取跨域图片时会失败（CORS taint）。
 *       本端点把外部图片拉回本站并以同源响应返回，附 CORS 头，供名片截图使用。
 *
 * 安全：
 *  - 仅允许白名单域名，防开放代理滥用
 *  - 限制单图大小（默认 20MB），防内存爆炸
 *  - 校验 Content-Type 为图片类型
 */

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

function isAllowedHost(hostname: string): boolean {
  if (ALLOWED_HOSTS.has(hostname)) return true
  // *.r2.dev / *.r2.cloudflarestorage.com
  if (hostname.endsWith(".r2.dev")) return true
  if (hostname.endsWith(".r2.cloudflarestorage.com")) return true
  return false
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

  // 协议与域名白名单
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new Response("仅支持 http/https", { status: 400 })
  }
  if (!isAllowedHost(parsed.hostname)) {
    return new Response("域名不在白名单", { status: 403 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    const upstream = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Circleica-ImageProxy/1.0",
        "Accept": "image/*",
      },
      redirect: "follow",
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!upstream.ok) {
      return new Response("上游拉取失败", { status: upstream.status })
    }

    // 校验 Content-Type 是图片
    const contentType = upstream.headers.get("content-type") || ""
    if (!contentType.startsWith("image/")) {
      return new Response("非图片内容", { status: 415 })
    }

    // 限制大小（防内存爆炸）
    const contentLength = Number(upstream.headers.get("content-length") || 0)
    if (contentLength > MAX_BYTES) {
      return new Response("图片过大", { status: 413 })
    }

    const buffer = await upstream.arrayBuffer()
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
        "X-Proxy-Source": parsed.origin,
      },
    })
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "上游超时" : "代理失败"
    return new Response(msg, { status: 502 })
  }
}
