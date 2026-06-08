import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { redirect } from "next/navigation"

export type { UserRole }

/** 角色等级：USER=0, ADMIN=1, SUPER_ADMIN=2 */
const ROLE_LEVEL: Record<UserRole, number> = {
  USER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
}

/** 判断 roleA 是否 >= roleB */
export function roleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[minimum] ?? 0)
}

/** 页面用：要求 ADMIN 或以上，否则重定向 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!roleAtLeast(user?.role ?? "USER", "ADMIN")) redirect("/")
  return session
}

/** 页面用：要求 SUPER_ADMIN，否则重定向 */
export async function requireSuperAdmin() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!roleAtLeast(user?.role ?? "USER", "SUPER_ADMIN")) redirect("/admin")
  return session
}

/** API 路由用：返回 session + role，null 表示无权限 */
export async function getAdminSession(minimumRole: UserRole = "ADMIN") {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  const role = user?.role ?? "USER"
  if (!roleAtLeast(role, minimumRole)) return null
  return { ...session, userRole: role }
}
