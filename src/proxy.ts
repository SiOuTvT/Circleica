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

// CSP 策略（模板缓存）
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
    // 生产环境严禁 eval：eval 是 XSS 利用者执行恶意脚本的主要通道，
    // 移除后即便有注入点也难以落地。开发环境保留 eval 以兼容 Next 的 HMR/dev overlay。
    const scriptPrefix = isDev
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
      : `script-src 'self' 'unsafe-inline'`
    _cspTemplate = {
      scriptPrefix,
      rest: directives.slice(2).join("; "),
    }
  }
  // 说明：Next 16 的 nonce 自动注入机制与官方文档不一致（实测：请求头/响应头 x-nonce
  // 无法与 body 内 Next 生成的 script nonce 对齐，strict-dynamic 下生产会白屏）。
  // 为保生产可用，script-src 统一用 'unsafe-inline'（配合其余严格指令：default-src 'self'、
  // style-src 受限、img/font/connect 白名单、frame-ancestors none、object-src none）。
  // 未来若 Next 修复 nonce 对齐，可恢复 strict-dynamic。
  return `default-src 'self'; ${_cspTemplate.scriptPrefix}; ${_cspTemplate.rest}`
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
    const csp = buildCSP("")
    res = NextResponse.next()
    res.headers.set("Content-Security-Policy", csp)
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
  }

  return withSecurityHeaders(res, req)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
