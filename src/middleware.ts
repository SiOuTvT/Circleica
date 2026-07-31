import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { isSuperAdminRoute, hasRole, type UserRole } from "@/lib/permissions"

// 生成随机 nonce（16 字节 base64）
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

// CSP 策略（模板缓存，仅 nonce 每次重建）
let _cspTemplate: { scriptPrefix: string; rest: string } | null = null

function buildCSP(nonce: string): string {
  if (!_cspTemplate) {
    const imgDomains = [
      "'self'", "data:", "blob:",
      "*.r2.dev", "*.r2.cloudflarestorage.com",
      "utfs.io", "uploadthing.com",
      "static.vndb.org", "t.vndb.org",
      "*.gravatar.com", "cdn.libravatar.org",
      ...(process.env.R2_PUBLIC_URL ? [new URL(process.env.R2_PUBLIC_URL).origin] : []),
      ...(process.env.NODE_ENV === "development" ? ["localhost"] : []),
    ]
    const directives = [
      `default-src 'self'`,
      "", // 占位：scriptSrc
      `style-src 'self' 'unsafe-inline'`,
      `img-src ${imgDomains.join(" ")}`,
      `font-src 'self' data:`,
      `connect-src 'self' https://api.vndb.org https://*.ingest.sentry.io https://*.sentry.io wss://*.sentry.io https://*.r2.cloudflarestorage.com`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `object-src 'none'`,
    ]
    const isDev = process.env.NODE_ENV === "development"
    _cspTemplate = {
      scriptPrefix: isDev ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'` : `script-src 'self' 'nonce-`,
      rest: directives.slice(2).join("; "),
    }
  }
  const scriptSrc = process.env.NODE_ENV === "development"
    ? _cspTemplate.scriptPrefix
    : `${_cspTemplate.scriptPrefix}${nonce}' 'strict-dynamic'`
  return `default-src 'self'; ${scriptSrc}; ${_cspTemplate.rest}`
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // CSP 仅对页面路由启用，不对 API 设置（避免干扰 NextAuth）
  const isPageRoute = !pathname.startsWith("/api/")

  // ── CSP nonce 传递 ──
  // 关键：nonce 必须写进「请求头」，不能只写响应头。
  // Server Component 里的 headers() 读到的是**请求头**，仅 res.headers.set("x-nonce")
  // 会让组件侧恒为 undefined —— 生产 CSP 含 'nonce-xxx' 'strict-dynamic' 时，
  // 无 nonce 的内联脚本（主题脚本 + Next 自身的 hydration 脚本）会被浏览器全部拦截，
  // 表现为线上白屏 / 主题闪烁；而 dev 分支用 'unsafe-inline'，本地完全复现不出来。
  //
  // 同时把 CSP 也写入请求头：Next 会据此为自己注入的 script 标签补 nonce 属性，
  // 缺这一步则框架脚本在 strict-dynamic 下依然被拦。
  let res: NextResponse

  if (isPageRoute) {
    const nonce = generateNonce()
    const csp = buildCSP(nonce)
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-nonce", nonce)
    requestHeaders.set("Content-Security-Policy", csp)
    res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set("Content-Security-Policy", csp)
    res.headers.set("x-nonce", nonce)
  } else {
    res = NextResponse.next()
  }

  // 管理后台路由保护
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: "circleica-session-token" })
    if (!token) {
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
    const role = token.role as string
    if (!hasRole(role as UserRole, "ADMIN")) {
      return NextResponse.redirect(new URL("/", req.url))
    }
    // SUPER_ADMIN 专属路由受保护：ADMIN 不可访问（路由清单由 lib/permissions 统一维护）
    if (role === "ADMIN" && isSuperAdminRoute(pathname)) {
      return NextResponse.redirect(new URL("/admin", req.url))
    }
  }

  // 安全头
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("X-Frame-Options", "DENY")
  // X-XSS-Protection 已废弃，设为 0 禁用（依赖 CSP 防护）
  res.headers.set("X-XSS-Protection", "0")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin")

  // HSTS：真实协议需从 x-forwarded-proto 判断（H2）。
  // 反向代理（TLS 终止）后 req.nextUrl.protocol 常为 http，若仅据此判断，
  // 会导致 HTTPS 站点永远不发送 HSTS，失去传输安全保护。
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    req.nextUrl.protocol.replace(":", "")
  const isSecure = proto === "https"
  if (isSecure) {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  } else {
    res.headers.delete("Strict-Transport-Security")
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
