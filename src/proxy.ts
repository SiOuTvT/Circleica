import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { isSuperAdminRoute, hasRole, type UserRole } from "@/lib/permissions"

// ─────────────────────────────────────────────────────────────
// Next.js 16 起 `middleware` 文件约定已废弃，官方改用 `proxy`。
// 文件名必须是 `src/proxy.ts`，且导出的函数必须叫 `proxy`（或 default），
// 否则构建期直接抛 ProxyMissingExportError。
// 行为、matcher 配置与原 middleware 完全一致；standalone 产物中 Next 仍会把
// proxy.js 回写为 middleware.js，运行时（node .next/standalone/server.js）无感。
// ─────────────────────────────────────────────────────────────

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

// ── 需要登录才能访问的页面（精确匹配，不做前缀通配）──
// 用 Set 精确匹配而非 startsWith("/profile")：/profile/[id] 是公开的用户主页，
// 前缀通配会把它一起挡掉。
//
// 这些页面自己也有 redirect("/login")，但页面内的 redirect() 在文档请求（首屏直达）下
// 会被流式 RSC 渲染吞掉：layout 外壳已以 200 发出，页面再抛 NEXT_REDIRECT 已无法回改状态码，
// Next 降级为 body 内嵌的 RSC 软跳转（客户端 JS 完成跳转）—— 用户会先白等约一秒再被弹走。
// （此降级源于流式 RSC 渲染本身，与是否有 loading.tsx / 根级 Suspense 无关，已实测证伪该旧假设。）
// 在 proxy 层先拦一道拿到的是真正的 307，还省掉一次注定要丢弃的页面渲染。
// 页面内的 redirect 一律保留，作为纵深防御。
const AUTH_REQUIRED_PATHS = new Set(["/profile", "/profile/edit", "/notifications"])

// getToken 的 salt 默认取 cookieName（见 @auth/core/jwt 的 `salt = cookieName`），
// 而签发侧用的是 auth.ts 里 cookies.sessionToken.name。
// 两处必须同名，否则解密静默失败、getToken 恒返回 null，
// 表现为已登录用户被反复弹回登录页。改 cookie 名时务必同步这里。
const SESSION_COOKIE_NAME = "circleica-session-token"

function readToken(req: NextRequest) {
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET, cookieName: SESSION_COOKIE_NAME })
}

/** 安全头。抽成函数是为了让重定向响应也能带上 —— 早前只有放行分支设置，
 *  守卫拦截产生的 3xx 一律裸奔，HSTS 也跟着丢，等于给降级攻击留了个窗口。 */
function withSecurityHeaders(res: NextResponse, req: NextRequest): NextResponse {
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
  if (proto === "https") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  } else {
    res.headers.delete("Strict-Transport-Security")
  }
  return res
}

/** 统一的重定向出口，保证 3xx 也带全套安全头。 */
function redirectTo(req: NextRequest, url: URL): NextResponse {
  return withSecurityHeaders(NextResponse.redirect(url), req)
}

function loginUrlFor(req: NextRequest, callbackPath: string): URL {
  const url = new URL("/login", req.url)
  url.searchParams.set("callbackUrl", callbackPath)
  return url
}

export async function proxy(req: NextRequest) {
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

  // 登录守卫：未登录访问受保护页面，直接 307 到登录页
  // 尾部斜杠归一后再比对，避免 /notifications/ 绕过（Next 默认 trailingSlash=false，
  // 但反向代理改写路径时仍可能带上）。
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  if (AUTH_REQUIRED_PATHS.has(normalizedPath)) {
    const token = await readToken(req)
    if (!token) return redirectTo(req, loginUrlFor(req, normalizedPath))
  }

  // 管理后台路由保护
  if (pathname.startsWith("/admin")) {
    const token = await readToken(req)
    if (!token) return redirectTo(req, loginUrlFor(req, pathname))
    const role = token.role as string
    if (!hasRole(role as UserRole, "ADMIN")) {
      return redirectTo(req, new URL("/", req.url))
    }
    // SUPER_ADMIN 专属路由受保护：ADMIN 不可访问（路由清单由 lib/permissions 统一维护）
    if (role === "ADMIN" && isSuperAdminRoute(pathname)) {
      return redirectTo(req, new URL("/admin", req.url))
    }
  }

  return withSecurityHeaders(res, req)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
