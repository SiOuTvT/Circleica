import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbSetter } from "@/components/breadcrumb-setter"
import { Heart } from "lucide-react"
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
      <header className="mb-4 sm:mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-fit shrink-0 items-center justify-center text-primary">
            <Heart className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Favorites</p>
            <h1 className="font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl">我的收藏</h1>
            {total > 0 && (
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                收藏的同人游戏共 ${total} 部，按收藏时间倒序
              </p>
            )}
          </div>
        </div>
      </header>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">还没有收藏任何游戏</p>
          <p className="mt-1 text-xs text-muted-foreground">
            去 <Link href="/discover" className="text-primary hover:underline underline-offset-4 decoration-1 transition-colors duration-200">发现</Link> 看看感兴趣的游戏吧
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((f) => (
            <Link
              key={f.id}
              href={`/games/${f.game.id}`}
              className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:ring-foreground/10 hover:shadow-[0_3px_8px_rgba(0,0,0,0.08)] hover:-translate-y-px"
              >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
                {f.game.coverImage ? (
                  <Image
                    src={f.game.coverImage}
                    alt={f.game.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
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
                <p className="mt-1.5 text-xs text-muted-foreground">{timeAgo(f.createdAt)}</p>
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
