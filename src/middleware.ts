import { NextRequest, NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  res.headers.set("x-pathname", req.nextUrl.pathname)

  // 安全头
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
