import { NextResponse, type NextRequest } from "next/server"

/**
 * B-23：为「非 /api」的页面与资源请求统一回显 x-request-id 响应头并输出 access log。
 * /api 路由由 withHandler 统一处理（x-request-id + access log + 错误/限流封装），此处排除避免重复。
 *
 * 说明：本文件运行于 Edge runtime，仅做轻量请求头透传与日志，不涉及任何数据存储或业务逻辑。
 */
export function middleware(request: NextRequest) {
  const incoming = request.headers.get("x-request-id")
  const requestId = incoming || crypto.randomUUID()

  const res = NextResponse.next()
  res.headers.set("x-request-id", requestId)

  console.log(
    JSON.stringify({
      level: "info",
      t: "access",
      requestId,
      method: request.method,
      route: request.nextUrl.pathname,
      ua: request.headers.get("user-agent")?.slice(0, 120) ?? null,
    }),
  )

  return res
}

export const config = {
  // 排除 /api（交给 withHandler）、_next 静态资源、favicon 与常见静态后缀
  matcher: [
    "/",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf)$).*)",
  ],
}
