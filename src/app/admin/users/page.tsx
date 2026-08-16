import { Pagination } from "@/components/ui/pagination"
import { requireSuperAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import dynamic from "next/dynamic"

interface AdminUserRow {
  id: string
  username: string
  email: string
  role: string
  avatar: string | null
  createdAt: string
  _count: { favorites: number; comments: number; checkIns: number }
}

const UsersManager = dynamic(() => import("@/components/users-manager").then(m => ({ default: m.UsersManager })), {
  loading: () => <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>,
})

export const metadata = { title: "用户管理 · 管理后台" }

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireSuperAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const q = sp.q?.trim() ?? ""
  const limit = 20
  const skip = (page - 1) * limit

  const where = q ? {
    OR: [
      { username: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
    ]
  } : {}

  // 使用缓存减少 _count 联查压力（2 分钟 TTL）
  const cacheKeyUsers = cacheKey("admin:users", String(page), q, String(limit))
  let cachedData: { users: AdminUserRow[]; total: number } | null = null

  try {
    cachedData = await cache.get<typeof cachedData>(cacheKeyUsers)
  } catch (e) {
    logger.db.error("[AdminUsers] Cache get failed", e)
  }

  let users: AdminUserRow[]
  let total: number

  if (cachedData) {
    ({ users, total } = cachedData)
  } else {
    // 并行查询用户列表和总数
    const [usersResult, totalResult] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: {
          id: true, username: true, email: true, role: true, avatar: true,
          createdAt: true,
          _count: { select: { favorites: true, comments: true, checkIns: true } },
        },
      }),
      prisma.user.count({ where }),
    ])
    users = usersResult.map(u => ({ ...u, createdAt: u.createdAt.toISOString() }))
    total = totalResult

    // 写入缓存
    try {
      await cache.set(cacheKeyUsers, { users, total }, 120)
    } catch (e) {
      logger.db.error("[AdminUsers] Cache set failed", e)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <AdminPageContainer
      eyebrow="USERS"
      title="用户管理"
      description={`共 ${total} 个用户`}
      actions={<AdminSearch name="q" defaultValue={q} placeholder="搜索用户…" />}
    >
      <UsersManager initialUsers={users} />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/users"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}
