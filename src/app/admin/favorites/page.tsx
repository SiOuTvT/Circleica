import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
import { Card } from "@/components/ui/card"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { adminSearchInput } from "@/lib/admin-styles"
import { Badge } from "@/components/ui/badge"
import { Heart, Search } from "lucide-react"
import Image from "next/image"
import dynamic from "next/dynamic"

const FavoriteDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.FavoriteDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "收藏记录 · 管理后台" }

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
        user: { select: { id: true, username: true, avatar: true } },
        game: { select: { id: true, title: true, coverImage: true } },
      },
    }),
    prisma.favorite.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="FAVORITES"
        title="收藏记录"
        description={
          <Badge variant="secondary" size="lg">{total} 条记录</Badge>
        }
        action={
          <form method="get" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
            <input name="q" defaultValue={q} placeholder="搜索用户或游戏…" aria-label="搜索用户或游戏" className={adminSearchInput} />
          </form>
        }
      />

      {favorites.length === 0 ? (
        <EmptyState icon={Heart} title="暂无收藏记录" bordered />
      ) : (
        <div className="space-y-2">
          {favorites.map((fav) => (
            <Card
              key={fav.id}
              size="default" radius="xl"
              className="group flex-row items-center gap-4 hover:ring-primary/30"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {fav.game.coverImage ? (
                  <Image src={fav.game.coverImage} alt={fav.game.title} width={48} height={48} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Heart className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {fav.game.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  收藏者: {fav.user.username}
                </p>
              </div>
              <FavoriteDeleteBtn id={fav.id} />
            </Card>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/favorites"
        extraParams={q ? { q } : undefined}
      />
    </div>
  )
}