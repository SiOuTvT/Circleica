import { ThemeText } from "@/components/theme-text"
import { prisma } from "@/lib/prisma"
import { ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export const revalidate = 120
export const metadata = { title: "精选合集 · 同人游戏站" }

export default async function CollectionsPage() {
  // 查所有有原作的游戏，按原作分组
  const games = await prisma.game.findMany({
    where: { isPublished: true, isNsfw: false, NOT: { originalWork: "" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, serialId: true, title: true, coverImage: true, originalWork: true, favoriteCount: true },
  })

  // 按原作分组
  const groups = new Map<string, typeof games>()
  for (const g of games) {
    const key = g.originalWork
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(g)
  }

  // 按游戏数量降序排列
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <ThemeText className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">精选合集</h1>
        <p className="mt-1 text-sm opacity-60">按原作系列整理的同人游戏合集</p>
      </div>

      {sorted.length === 0 && (
        <p className="py-20 text-center text-sm opacity-50">暂无合集，管理员添加游戏时填写「原作」字段即可自动归类</p>
      )}

      {sorted.map(([originalWork, list]) => (
        <section key={originalWork}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-4 w-0.5 rounded-full bg-gradient-to-b from-blue-400 to-blue-400" />
              <h2 className="text-base font-bold">{originalWork}</h2>
              <span className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-[10px] opacity-60 ring-1 ring-black/[0.06] dark:ring-white/[0.06]">
                {list.length} 个游戏
              </span>
            </div>
            <Link
              href={`/search?q=${encodeURIComponent(originalWork)}`}
              className="flex items-center gap-1 text-xs opacity-50 transition-colors hover:opacity-80"
            >
              查看全部 <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {list.slice(0, 8).map(g => (
              <Link
                key={g.id}
                href={`/games/${g.serialId}`}
                className="group overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-900 ring-1 ring-black/[0.06] dark:ring-white/[0.06] transition-all hover:-translate-y-1 hover:ring-black/[0.12] dark:hover:ring-white/[0.12] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                style={{ aspectRatio: "4/5" }}
              >
                <div className="relative h-full w-full">
                  {g.coverImage ? (
                    <Image
                      src={g.coverImage}
                      alt={g.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 16vw, 12vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-300 dark:bg-zinc-800 opacity-50 text-xs">无封面</div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="line-clamp-2 text-[10px] font-medium leading-tight text-zinc-200">{g.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </ThemeText>
  )
}
