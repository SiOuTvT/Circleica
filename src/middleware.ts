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
  const res = NextResponse.next()

  // 管理后台路由保护
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: "fangame-session-token" })
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

  // CSP 仅对页面路由设置，不对 API 设置（避免干扰 NextAuth）
  if (!pathname.startsWith("/api/")) {
    const nonce = generateNonce()
    res.headers.set("Content-Security-Policy", buildCSP(nonce))
    // 传递 nonce 给 Next.js，使其在内联脚本上自动添加 nonce 属性
    res.headers.set("x-nonce", nonce)
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
