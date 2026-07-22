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

/** 角色展示元信息（标签 + 徽标样式），全站角色徽标统一来源，禁止在各组件内联重复定义 */
export const ROLE_META: Record<UserRole, { label: string; className: string }> = {
  USER: { label: "用户", className: "bg-muted text-muted-foreground ring-1 ring-border" },
  ADMIN: { label: "管理员", className: "bg-blue-500/15 text-blue-600 light:text-blue-700 ring-1 ring-blue-500/20" },
  SUPER_ADMIN: { label: "站长", className: "bg-amber-500/15 text-amber-600 light:text-amber-700 ring-1 ring-amber-500/20" },
}
