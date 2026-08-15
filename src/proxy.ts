import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { isSuperAdminRoute, hasRole, type UserRole } from "@/lib/permissions"
import { enforceSameOrigin } from "@/lib/csrf"

// ─────────────────────────────────────────────────────────────
// Next.js 16 起 `middleware` 文件约定已废弃，官方改用 `proxy`。
// 文件名必须是 `src/proxy.ts`，且导出的函数必须叫 `proxy`（或 default），
// 否则构建期直接抛 ProxyMissingExportError。
// 行为、matcher 配置与原 middleware 完全一致；standalone 产物中 Next 仍会把
// proxy.js 回写为 middleware.js，运行时（node .next/standalone/server.js）无感。
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// CSP（每请求生成 nonce）。
// nonce 通过 x-nonce 请求头透传给 Server Component，由根 layout 读取并应用到自管
// 内联脚本（ThemeScript）；Next 会据此为自身注入的 framework / RSC-flight 内联脚本
// 自动补上「同一个」nonce 属性，故 strict-dynamic 下脚本全部放行、不再白屏。
//
// 关键前提（此前白屏的真正根因）：根 layout 必须读取 headers() 使全站 dynamic。
// 若页面被静态/ISR 缓存，HTML 里的 nonce 是构建期/上一次请求的固定值，与响应头
// 的 per-request nonce 不匹配 → 框架脚本被拦 → 白屏。见 src/app/layout.tsx。
// ─────────────────────────────────────────────────────────────
function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64")
}

function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development"
  const imgDomains = [
    "'self'", "data:", "blob:",
    "*.r2.dev", "*.r2.cloudflarestorage.com",
    "utfs.io", "uploadthing.com",
    "static.vndb.org", "t.vndb.org",
    "*.gravatar.com", "cdn.libravatar.org",
    ...(process.env.R2_PUBLIC_URL ? [new URL(process.env.R2_PUBLIC_URL).origin] : []),
    ...(process.env.NODE_ENV === "development" ? ["localhost"] : []),
  ]
  // 生产环境严禁 eval：eval 是 XSS 利用者执行恶意脚本的主要通道，
  // 移除后即便有注入点也难以落地。开发环境保留 eval 以兼容 Next 的 HMR/dev overlay。
  // 'strict-dynamic'：被 nonce 脚本加载的后续脚本（含 Next 自身 chunk、Sentry 等）
  // 自动放行，无需逐个白名单；'self' / 'unsafe-inline' 在 strict-dynamic 下被忽略。
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
  const directives = [
    `default-src 'self'`,
    scriptSrc,
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
const AUTH_REQUIRED_PATHS = new Set(["/profile", "/profile/edit", "/notifications", "/messages"])

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

// 静态资源不执行脚本 → 不需要 CSP/nonce，但仍需 nosniff / CORP 等安全头。
// 每请求 crypto.getRandomValues + 拼 CSP，在「一页几十张图」的弱机上是纯浪费 CPU。
const STATIC_ASSET_RE =
  /^\/uploads\/|\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|woff2?|txt|xml|webmanifest)$/i

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 静态资源：不执行脚本 → 跳过 nonce/CSP 生成（省弱机 CPU），直接带安全头 + 长缓存返回。
  // 但不能从 matcher 踢掉（仍需 X-Content-Type-Options: nosniff 防 MIME 嗅探）。
  const isStaticAsset = STATIC_ASSET_RE.test(pathname)
  if (isStaticAsset) {
    const res = NextResponse.next()
    if (pathname.startsWith("/uploads/")) {
      // 上传文件名 `${timestamp}-${randomHex}.${ext}`（storage.ts:56）永不复用 → immutable 安全
      res.headers.set("Cache-Control", "public, max-age=31536000, immutable")
    }
    return withSecurityHeaders(res, req)
  }

  // CSP 仅对页面路由启用，不对 API 设置（避免干扰 NextAuth）
  const isPageRoute = !pathname.startsWith("/api/")

  // 状态变更方法（用于同源 Origin 校验的触发条件，SEC-6）
  const isStateChanging =
    req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE"

  // ── CSP nonce 生成 + 透传 ──
  // 1) 生成每请求 nonce，写入响应头 Content-Security-Policy（script-src 'nonce-…' 'strict-dynamic'）。
  // 2) 同一 nonce 同时写进「请求头」x-nonce，并通过 NextResponse.next({ request:{ headers } })
  //    透传给 Server Component：根 layout 用 headers().get('x-nonce') 读取并应用到自管内联脚本，
  //    Next 也会据此为自身注入的 framework / RSC-flight 内联脚本自动补相同 nonce。
  //    二者同源 → strict-dynamic 下脚本全部放行，不再白屏。
  let res: NextResponse

  if (isPageRoute) {
    const nonce = generateNonce()
    const csp = buildCSP(nonce)
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-nonce", nonce)
    res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set("Content-Security-Policy", csp)
  } else {
    res = NextResponse.next()
  }

  // 兼容 legacy middleware（B-23）：非 /api 页面回显 x-request-id 响应头并输出 access log。
  // 删除 src/middleware.ts 后在此保留等价行为，避免可观测性回归；
  // /api 路由由 withHandler 统一处理，故此处仅对齐非 api 页面分支。
  if (isPageRoute) {
    const incoming = req.headers.get("x-request-id")
    const requestId = incoming || crypto.randomUUID()
    res.headers.set("x-request-id", requestId)
    console.log(
      JSON.stringify({
        level: "info",
        t: "access",
        requestId,
        method: req.method,
        route: req.nextUrl.pathname,
        ua: req.headers.get("user-agent")?.slice(0, 120) ?? null,
      }),
    )
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

  // 后台 API 网关级兜底闸：上面的 /admin 守卫只覆盖「页面」路径（以 /admin 开头），
  // 而后台写接口的 URL 是 /api/admin/...（以 /api/ 开头），并不命中，此前完全依赖
  // 各接口内部各自调用 requireAdminRole。这里补一道强制关卡：未登录或角色 < ADMIN
  // 一律 401/403，即使某个接口漏写内部校验也不会裸奔。
  // 具体的 SUPER_ADMIN 专属接口仍由各接口自身的 requireAdminRole("SUPER_ADMIN") 精确把关。
  if (pathname.startsWith("/api/admin")) {
    const token = await readToken(req)
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const role = token.role as string
    if (!hasRole(role as UserRole, "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // CSRF 纵深防御（SEC-B / SEC-6）：后台写接口强制同源（仅状态变更方法），
    // 无 Origin 且无法回退到同源 Referer 的一律拒绝，关闭「无头请求」绕过面。
    if (isStateChanging) {
      const adminOc = enforceSameOrigin(req)
      if (adminOc) return adminOc
    }
  }

  // SEC-B / SEC-6：跨站写纵深防御 —— 对所有 /api/ 状态变更请求（非 NextAuth 内部路由）强制同源，
  // 要求 Origin 或 Referer 至少其一存在且同源；均缺失（无头请求 / curl 等）一律拒绝。
  // Bearer Token 调用的 API 客户端不受约束（无 Cookie，非 CSRF 面）。
  // 排除 /api/auth/：NextAuth 自带 CSRF 保护且对 Origin 敏感，避免误伤登录态。
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/") && isStateChanging) {
    const oc = enforceSameOrigin(req)
    if (oc) return oc
  }

  return withSecurityHeaders(res, req)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
