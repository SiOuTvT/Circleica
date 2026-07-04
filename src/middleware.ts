import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

// 生成随机 nonce（16 字节 base64）
function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

// CSP 策略
function buildCSP(nonce: string): string {
  // 开发模式需要 unsafe-eval：React 使用 eval() 重建调用栈用于调试
  const scriptSrc = process.env.NODE_ENV === "development"
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`

  // 允许的图片来源域名
  const imgDomains = [
    "'self'",
    "data:",
    "blob:",
    // Cloudflare R2
    "*.r2.dev",
    "*.r2.cloudflarestorage.com",
    // UploadThing
    "utfs.io",
    "uploadthing.com",
    // VNDB
    "static.vndb.org",
    "t.vndb.org",
    // 头像源
    "*.gravatar.com",
    "cdn.libravatar.org",
    // R2 自定义域名（如有配置）
    ...(process.env.R2_PUBLIC_URL ? [new URL(process.env.R2_PUBLIC_URL).origin] : []),
    // 开发环境
    ...(process.env.NODE_ENV === "development" ? ["localhost"] : []),
  ]

  const directives = [
    `default-src 'self'`,
    scriptSrc,
    // style-src 保留 unsafe-inline：Tailwind CSS 运行时样式注入需要
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imgDomains.join(" ")}`,
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

  // 管理后台路由保护
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: "fangame-session-token" })
    if (!token) {
      const loginUrl = new URL("/login", req.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
    const role = token.role as string
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url))
    }
    // SUPER_ADMIN 专属路由：用户管理、站点设置、主题、头像框、情感消息、资源标签
    const superAdminRoutes = [
      "/admin/users", "/admin/site-settings", "/admin/theme",
      "/admin/avatar-frames", "/admin/emotional-messages", "/admin/resource-tags",
      "/admin/achievements",
    ]
    if (role === "ADMIN" && superAdminRoutes.some(r => pathname.startsWith(r))) {
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

  // HSTS：仅在生产环境 HTTPS 下启用（避免 HTTP 站点误设导致无法访问）
  const isSecure = req.nextUrl.protocol === "https"
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
