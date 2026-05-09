import { UsersManager } from "@/components/users-manager"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "用户管理 · 管理后台" }

export default async function AdminUsersPage() {
  await requireAdmin()
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, username: true, email: true, role: true, avatar: true,
      createdAt: true,
      _count: { select: { favorites: true, comments: true, checkIns: true } },
    },
  })
  const data = users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() }))
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-foreground">用户管理</h1>
      <UsersManager initialUsers={data} />
    </div>
  )
}
