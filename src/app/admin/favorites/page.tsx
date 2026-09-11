import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { AdminDataTable } from "@/components/admin/admin-data-table"
import { formatDateTime } from "@/lib/date"
import { Badge } from "@/components/ui/badge"
import { Heart } from "lucide-react"
import dynamic from "next/dynamic"

const FavoriteDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.FavoriteDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "收藏记录" }

export default async function AdminFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const q = sp.q?.trim() ?? ""
  const limit = 20
  const skip = (page - 1) * limit

  // 优化：将 OR 查询拆分为两个独立查询，提升索引命中率
  const where = q ? {
    OR: [
      { user: { username: { contains: q, mode: "insensitive" as const } } },
      { game: { title: { contains: q, mode: "insensitive" as const } } },
    ],
  } : {}

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        createdAt: true,
        user: { select: { id: true, username: true, avatar: true } },
        game: { select: { id: true, title: true, coverImage: true } },
      },
    }),
    prisma.favorite.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <AdminPageContainer
      eyebrow="FAVORITES"
      title="收藏记录"
      description={
        <Badge variant="secondary" size="lg">{total} 条记录</Badge>
      }
      actions={<AdminSearch name="q" defaultValue={q} placeholder="搜索用户或游戏…" />}
    >

      <AdminDataTable
        rows={favorites}
        rowKey={(fav) => fav.id}
        emptyIcon={Heart}
        emptyTitle="暂无收藏记录"
        columns={[
          {
            key: "user",
            label: "用户",
            width: "24%",
            render: (fav) => (
              <span className="block truncate" title={fav.user.username}>{fav.user.username}</span>
            ),
          },
          {
            key: "game",
            label: "游戏",
            render: (fav) => (
              <span className="block truncate font-medium text-foreground" title={fav.game.title}>
                {fav.game.title}
              </span>
            ),
          },
          {
            key: "createdAt",
            label: "时间",
            width: "180px",
            render: (fav) => <span className="text-xs text-muted-foreground">{formatDateTime(fav.createdAt)}</span>,
          },
        ]}
        actions={(fav) => <FavoriteDeleteBtn id={fav.id} />}
        actionsWidth="88px"
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/favorites"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}