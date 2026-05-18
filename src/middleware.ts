import { NextRequest, NextResponse } from "next/server"

// CSP 策略构建 - 兼容 Next.js 的 CSP（不使用 strict-dynamic + nonce，因为 Next.js 不会自动注入 nonce 到 script 标签）
function buildCSP(): string {
  const directives = [
    `default-src 'self'`,
    // Next.js 需要 'unsafe-eval' 和 'unsafe-inline' 用于客户端导航和热更新
    `script-src 'self' 'unsafe-eval' 'unsafe-inline'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https: http:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api.vndb.org https://*.ingest.sentry.io https://*.sentry.io wss://*.sentry.io https://*.r2.cloudflarestorage.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ]
  return directives.join("; ")
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const res = NextResponse.next()
  res.headers.set("x-pathname", pathname)

  // 安全头（所有路由）
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  
  // HSTS（仅生产环境）
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
  }

  // CSP 仅对页面路由设置，不设置在 API 路由上（避免干扰 NextAuth 等认证流程）
  if (!pathname.startsWith("/api/")) {
    res.headers.set("Content-Security-Policy", buildCSP())
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
