import { NextRequest, NextResponse } from "next/server"

/**
 * 同源校验工具（SEC-B / SEC-6 CSRF 纵深防御）。
 * 独立成模块以便单测，不依赖 next-auth，避免测试环境拉入 ESM 依赖。
 */

function sameOriginHosts(req: NextRequest): string[] {
  const reqHost = req.nextUrl.host
  const reqHostname = req.nextUrl.hostname
  const authUrlHost = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).host
    : null
  const hosts = authUrlHost
    ? [reqHost, reqHostname, authUrlHost]
    : [reqHost, reqHostname]
  // 开发环境追加 localhost/127.0.0.1/[::1] 的各种端口组合，防止浏览器 Origin 与 nextUrl 格式不一致
  if (process.env.NODE_ENV === "development") {
    hosts.push("localhost", "127.0.0.1", "[::1]")
  }
  return hosts
}

/** Origin 存在时校验是否同源；无 Origin 返回 null（交由调用方决定兜底策略）。 */
export function checkSameOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin")
  if (!origin) return null
  try {
    const originUrl = new URL(origin)
    const hosts = sameOriginHosts(req)
    const hostOk = hosts.includes(originUrl.host) || hosts.includes(originUrl.hostname)
    if (!hostOk) {
      return NextResponse.json({ error: "Forbidden: cross-origin request" }, { status: 403 })
    }
    return null
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
}

/**
 * 状态变更请求的同源强制校验（SEC-B / SEC-6 CSRF 纵深防御升级）。
 * 规则：
 *  - Bearer Token 调用的 API 客户端不受同源约束（无 Cookie，非 CSRF 面）；
 *  - 有 Origin：host 同源才放行（复用 checkSameOrigin 的同源判定）；
 *  - 无 Origin：回退校验 Referer，同源才放行；
 *  - Origin 与 Referer 均缺失（无头请求 / curl 等）→ 拒绝，关闭「无头请求」绕过面；
 *  - Origin/Referer 存在但跨站 → 拒绝。
 */
export function enforceSameOrigin(req: NextRequest): NextResponse | null {
  const authz = req.headers.get("authorization")
  if (authz && authz.toLowerCase().startsWith("bearer ")) return null

  const origin = req.headers.get("origin")
  if (origin) return checkSameOrigin(req)

  const referer = req.headers.get("referer")
  if (referer) {
    try {
      const r = new URL(referer)
      const hosts = sameOriginHosts(req)
      if (hosts.includes(r.host) || hosts.includes(r.hostname)) return null
    } catch {
      /* 非法 Referer，落到下面的拒绝分支 */
    }
  }
  return NextResponse.json(
    { error: "Forbidden: missing same-origin Origin or Referer" },
    { status: 403 },
  )
}
