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
import type { UserRole } from "@prisma/client"

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
