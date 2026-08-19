import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbSetter } from "@/components/breadcrumb-setter"
import { Heart, Star } from "lucide-react"
import { timeAgo } from "@/lib/time-ago"

export const dynamic = "force-dynamic"
export const metadata = { title: "我的收藏" }

export default async function MyFavoritesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = session.user.id

  let items: { id: string; createdAt: Date; game: { id: string; title: string; coverImage: string | null } }[] = []
  let total = 0
  try {
    const r = await loadFavorites(userId)
    items = r.items
    total = r.total
  } catch (e) {
    logger.db.error("[MyFavoritesPage] 查询失败", e)
  }

  return (
    <div className="container mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6">
      <BreadcrumbSetter segment="favorites" label="我的收藏" />
      <Breadcrumb />
      <div className="mb-4 flex items-center gap-2">
        <Heart className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">我的收藏</h1>
        <span className="text-sm text-muted-foreground">共 {total} 个</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">还没有收藏任何游戏</p>
          <p className="mt-1 text-xs text-muted-foreground">
            去 <Link href="/discover" className="text-primary hover:underline">发现</Link> 看看感兴趣的游戏吧
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((f) => (
            <Link
              key={f.id}
              href={`/games/${f.game.id}`}
              className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border/60 transition-shadow hover:ring-border"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                {f.game.coverImage ? (
                  <Image
                    src={f.game.coverImage}
                    alt={f.game.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Heart className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-2 text-sm font-medium leading-tight">{f.game.title}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3" />
                  {timeAgo(f.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )

  async function loadFavorites(uid: string) {
    const [items, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        take: 60,
        include: { game: { select: { id: true, title: true, coverImage: true } } },
      }),
      prisma.favorite.count({ where: { userId: uid } }),
    ])
    return { items, total }
  }
}
