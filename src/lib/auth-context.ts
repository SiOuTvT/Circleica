/**
 * API 路由认证上下文
 *
 * 从 NextAuth session 中提取当前用户信息，
 * 供 Service 层使用。Route handler 不直接调用 auth()。
 */

import { auth } from "@/lib/auth"
import { UnauthorizedError, ForbiddenError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { hasRole } from "@/lib/permissions"
import type { UserRole } from "@/generated/prisma/client"

export type SiteId = "circleica" | "galvelica"

export interface AuthContext {
  userId: string
  username: string
  role: UserRole
}

/**
 * 获取当前认证用户（必须已登录）
 */
export async function requireAuth(): Promise<AuthContext> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new UnauthorizedError()
  }

  // 获取最新 role（不依赖 JWT 中的缓存值）
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, username: true },
  })

  if (!user) {
    throw new UnauthorizedError("用户不存在")
  }

  return {
    userId: session.user.id,
    username: user.username,
    role: user.role,
  }
}

/**
 * 要求管理员或以上权限
 */
export async function requireAdminRole(minimumRole: UserRole = "ADMIN"): Promise<AuthContext> {
  const ctx = await requireAuth()
  if (!hasRole(ctx.role, minimumRole)) {
    throw new ForbiddenError()
  }
  return ctx
}

/**
 * 获取当前用户（可选，未登录返回 null）
 */
export async function getOptionalAuth(): Promise<AuthContext | null> {
  try {
    return await requireAuth()
  } catch (error) {
    if (error instanceof UnauthorizedError) return null
    throw error
  }
}

/**
 * 要求站点管理员权限（site × role 二元鉴权）
 *
 * SUPER_ADMIN 可访问任意站点；ADMIN 暂同权（后续 User 扩展 sitePermissions 字段后可细分）。
 * TODO(2026-08-07, 用户已拍板「延后但必须做」)：落地 User.sitePermissions 字段，
 * 实现「仅主站管理员 / 仅副站管理员」细分——当前 ADMIN 双站通权是已知架构债。
 */
export async function requireSiteAdmin(
  site: SiteId,
  minimumRole: UserRole = "ADMIN",
): Promise<AuthContext> {
  const ctx = await requireAuth()
  // SUPER_ADMIN 通行所有站点
  if (hasRole(ctx.role, "SUPER_ADMIN")) return ctx
  if (!hasRole(ctx.role, minimumRole)) {
    throw new ForbiddenError(`需要 ${minimumRole} 权限才能管理 ${site}`)
  }
  // 站点维度校验：显式确认 site 合法，杜绝此前 site 参数被静默忽略的问题。
  // 真正的「某管理员仅能管理指定站点」待 sitePermissions 落地后在此比较（见上方 TODO）；
  // 跨站数据泄漏的兜底由 services/admin.ts 按 source 过滤保证。
  if (site !== "circleica" && site !== "galvelica") {
    throw new ForbiddenError(`非法的站点域: ${String(site)}`)
  }
  return ctx
}
