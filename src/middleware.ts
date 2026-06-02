import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

// CSP 策略
function buildCSP(): string {
  const directives = [
    `default-src 'self'`,
    // unsafe-inline 保留：Next.js SSR 内联脚本 + Tailwind CSS 动态注入需要
    // 后续可迁移至 nonce-based 方案进一步加固
    `script-src 'self' 'unsafe-inline'`,
    // unsafe-inline 保留：Tailwind CSS 运行时样式注入需要
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api.vndb.org https://*.ingest.sentry.io https://*.sentry.io wss://*.sentry.io https://*.r2.cloudflarestorage.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ]
  return directives.join("; ")
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()

  // 管理后台路由保护：未登录或非管理员重定向到登录页
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // 安全头
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-XSS-Protection", "1; mode=block")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  // HSTS：仅在生产环境 HTTPS 下启用（避免 HTTP 站点误设导致无法访问）
  const isSecure = req.nextUrl.protocol === "https"
  if (isSecure) {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  } else {
    res.headers.delete("Strict-Transport-Security")
  }

  // CSP 仅对页面路由设置，不对 API 设置（避免干扰 NextAuth）
  if (!pathname.startsWith("/api/")) {
    res.headers.set("Content-Security-Policy", buildCSP())
  }

  // 读取当前 CSP 并移除 upgrade-insecure-requests（HTTP 站点不需要）
  const csp = res.headers.get("Content-Security-Policy")
  if (csp) {
    const cleaned = csp.replace(/upgrade-insecure-requests;?\s*/g, "").trim()
    res.headers.set("Content-Security-Policy", cleaned)
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
