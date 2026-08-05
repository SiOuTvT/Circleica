import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * 为每次请求注入 CSP nonce 到请求头 x-nonce。
 * 根布局（app/layout.tsx）读取该头并传给 ThemeScript，使内联主题脚本带上正确 nonce，
 * 同时避免 ThemeScript 自己调用 headers() 强制根布局 dynamic。
 *
 * 注意：根布局仍需读取该头（headers()），故根布局仍为动态渲染——
 * 若需彻底静态化，需改为不在渲染期读取请求头（更大重构，需浏览器验证，暂不动）。
 */
export function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID()
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-nonce", nonce)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  // 跳过静态资源与图片优化，避免无谓开销
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
}
