/**
 * 权限相关的单一事实来源（Single Source of Truth）
 *
 * 管理后台"超级管理员专属页面"路由集中在此定义，middleware 与任何需要判断
 * 路由权限的地方都从这里取，避免散落在多处导致遗漏/漂移。
 *
 * 新增超级管理员专属页面时，必须在此登记，否则 ADMIN 也能访问。
 */
import type { UserRole } from "@prisma/client"

/** 超级管理员专属页面路由（前缀匹配，按段精确匹配避免误命中） */
export const SUPER_ADMIN_ROUTES: readonly string[] = [
  "/admin/users",
  "/admin/site-settings",
  "/admin/theme",
  "/admin/avatar-frames",
  "/admin/emotional-messages",
  "/admin/resource-tags",
  "/admin/achievements",
]

/** 判断某路径是否为超级管理员专属路由（按路径段精确匹配，避免 /admin/users-export 误命中） */
export function isSuperAdminRoute(pathname: string): boolean {
  return SUPER_ADMIN_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/"),
  )
}

/** 角色等级：数值越大权限越高 */
export const ROLE_LEVEL: Record<UserRole, number> = {
  USER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
}

/** 判断 caller 是否满足 minimumRole */
export function hasRole(caller: UserRole, minimumRole: UserRole): boolean {
  return (ROLE_LEVEL[caller] ?? 0) >= (ROLE_LEVEL[minimumRole] ?? 0)
}
