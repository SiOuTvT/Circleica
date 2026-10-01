import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

/**
 * 后台 API 兜底鉴权（纵深防御的第一层）
 * ─────────────────────────────────────────────────────────
 * 背景：项目此前没有全局 middleware，/api/admin/* 的权限完全依赖各路由
 * 自己调用 requireSiteAdmin()。经核查现状是 56/56 都有校验（安全），
 * 但缺少兜底：将来任何人新增后台路由时若漏写那行校验，就是一条直接暴露的越权入口，
 * 且没有任何机制能拦住它。
 *
 * 设计：这里做第一层粗粒度拦截 —— 校验「已登录 + 具备管理员角色」。
 * 站点维度、细粒度角色的校验仍由业务路由内的 requireSiteAdmin() 负责（第二层，保持不变）。
 * 两层并存，任一层失效另一层仍能兜住。
 *
 * 注意：运行在 Edge Runtime，不能访问数据库/Prisma，只能读 JWT。
 * 角色值参考 src/lib/auth-context.ts 的 requireSiteAdmin：SUPER_ADMIN 通行、ADMIN 起。
 */
export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    // 兼容 NextAuth v5(AUTH_SECRET) 与 v4(NEXTAUTH_SECRET) 两种环境变量命名
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    // auth.ts 中自定义了 cookie 名称，必须显式传入，否则 getToken 读默认值会拿不到
    cookieName: "circleica-session-token",
  })

  const role = (token as { role?: string } | null)?.role
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN"

  if (!isAdmin) {
    // 未登录返回 401，已登录但非管理员返回 403，便于区分问题
    return NextResponse.json(
      { error: token ? "无权访问后台接口" : "未登录" },
      { status: token ? 403 : 401 },
    )
  }

  return NextResponse.next()
}

export const config = {
  // 只拦截后台 API；前台页面与 /api 下非 admin 路由不受影响
  matcher: ["/api/admin/:path*"],
}
