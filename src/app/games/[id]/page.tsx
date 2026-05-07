import { CommentSection } from "@/components/comment-section"
import { GameDetailActions } from "@/components/game-detail-actions"
import { GameRating } from "@/components/game-rating"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Calendar, Download, ExternalLink, Eye } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const game = await prisma.game.findUnique({
    where: { id },
    select: { title: true, description: true, coverImage: true, originalWork: true },
  })
  if (!game) return { title: "游戏详情" }
  return {
    title: `${game.title} · 同人游戏站`,
    description: game.description?.slice(0, 160) || `${game.originalWork ? `${game.originalWork}同人游戏` : "同人游戏"} - ${game.title}`,
    openGraph: {
      title: game.title,
      description: game.description?.slice(0, 160) || "",
      images: game.coverImage ? [{ url: game.coverImage, width: 800, height: 1000 }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: game.title,
      images: game.coverImage ? [game.coverImage] : [],
    },
  }
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  const game = await prisma.game.findFirst({
    where: { id, isPublished: true },
    include: {
      tags: { select: { tag: { select: { name: true, color: true } } } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      },
      creators: {
        include: { creator: { select: { id: true, name: true, nameJa: true, avatar: true } } },
      },
      logs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  })

  if (!game) notFound()

  // 增加浏览量
  prisma.game.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  const tags = game.tags.map((t) => t.tag)
  const screenshots: string[] = JSON.parse(game.screenshots || "[]")
  const downloadLinks: { label: string; url: string }[] = JSON.parse(game.downloadLinks || "[]")
  const reportCount = await prisma.gameReport.count({ where: { gameId: id } })

  let isFav = false
  let playStatus: string | null = null
  if (session?.user?.id) {
    const [fav, ps] = await Promise.all([
      prisma.favorite.findUnique({ where: { userId_gameId: { userId: session.user.id, gameId: id } } }),
      prisma.playStatus.findUnique({ where: { userId_gameId: { userId: session.user.id, gameId: id } } }),
    ])
    isFav = !!fav
    playStatus = ps?.status ?? null
  }

  const related = await prisma.game.findMany({
    where: {
      id: { not: id },
      isPublished: true,
      tags: { some: { tag: { name: { in: tags.map((t) => t.name) } } } },
    },
    take: 4,
    select: { id: true, title: true, coverImage: true, isNsfw: true },
  })

  return (
    <div className="mx-auto max-w-[1300px] lg:ml-[max(calc((100vw-1200px)/2),0px)]">
      {/* Hero 封面区 */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-zinc-900 light:bg-zinc-100" style={{ minHeight: 280 }}>
        {game.coverImage && (
          <>
            {/* 模糊背景 */}
            <div
              className="absolute inset-0 scale-110"
              style={{
                backgroundImage: `url(${game.coverImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(28px) brightness(0.35)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/30 to-transparent light:from-zinc-100/90 light:via-zinc-100/30" />
          </>
        )}
        <div className="relative z-10 flex gap-6 p-6">
          {/* 封面图 */}
          <div
            className="hidden shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 sm:block"
            style={{ width: 160, aspectRatio: "4/5" }}
          >
            {game.coverImage ? (
              <Image src={game.coverImage} alt={game.title} width={160} height={200} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-600 text-xs">暂无封面</div>
            )}
          </div>

          {/* 信息 */}
          <div className="flex flex-col justify-end gap-3 py-2">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Link
                  key={tag.name}
                  href={`/search?tag=${encodeURIComponent(tag.name)}`}
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                  style={{ color: tag.color, background: `${tag.color}18`, outline: `1px solid ${tag.color}40` }}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
            <h1 className="text-3xl font-bold leading-tight text-white light:text-zinc-900">{game.title}</h1>
            {game.originalWork && (
              <p className="text-base text-zinc-300 light:text-zinc-700">原作：{game.originalWork}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400 light:text-zinc-600">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                {game.viewCount} 次浏览
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                {new Date(game.createdAt).toLocaleDateString("zh-CN")}
              </span>
              {game.vndbId && (
                <a
                  href={`https://vndb.org/v${game.vndbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
                >
                  VNDB <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮区 */}
      <GameDetailActions
        gameId={id}
        isFav={isFav}
        favCount={game.favoriteCount}
        playStatus={playStatus}
        reportCount={reportCount}
        isLoggedIn={!!session?.user}
      />

      {/* 创作者 */}
      {game.creators.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-100 light:text-zinc-900">
            <span className="h-4 w-0.5 rounded-full bg-gradient-to-b from-blue-400 to-sky-400" />
            创作者
          </h2>
          <div className="flex flex-wrap gap-3">
            {game.creators.map(gc => (
              <Link key={`${gc.creatorId}-${gc.role}`} href={`/creators/${gc.creatorId}`}
                className="flex items-center gap-2.5 rounded-xl bg-zinc-900 light:bg-white px-3 py-2 ring-1 ring-white/[0.06] light:ring-black/[0.06] transition-all hover:bg-zinc-800 light:hover:bg-zinc-50 hover:ring-white/10 light:hover:ring-black/10">
                {gc.creator.avatar ? (
                  <Image src={gc.creator.avatar} alt={gc.creator.name} width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-xs font-bold text-white">
                    {(gc.creator.nameJa || gc.creator.name)[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-zinc-100 light:text-zinc-900">{gc.creator.nameJa || gc.creator.name}</p>
                  <p className="text-xs text-zinc-400 light:text-zinc-500">{{ scenario:"脚本", art:"原画", chardesign:"角色设计", director:"导演", music:"音乐", songs:"主题曲" }[gc.role] ?? gc.role}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 评分 */}
      <div className="mb-6">
        <GameRating gameId={id} isLoggedIn={!!session?.user} />
      </div>

      {/* 简介 */}
      {game.description && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-100 light:text-zinc-900">
            <span className="h-4 w-0.5 rounded-full bg-gradient-to-b from-blue-400 to-sky-400" />
            游戏简介
          </h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-300 light:text-zinc-700">
            {game.description}
          </p>
        </section>
      )}

      {/* 下载地址 */}
      {downloadLinks.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-100 light:text-zinc-900">
            <span className="h-4 w-0.5 rounded-full bg-gradient-to-b from-blue-400 to-sky-400" />
            下载地址
          </h2>
          <div className="flex flex-wrap gap-2">
            {downloadLinks.map((dl, i) => (
              <a
                key={i}
                href={dl.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-zinc-800 light:bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-200 light:text-zinc-700 ring-1 ring-white/[0.06] light:ring-black/[0.06] transition-all hover:bg-zinc-700 light:hover:bg-zinc-200 hover:ring-white/10 light:hover:ring-black/10 active:scale-[0.98]"
              >
                <Download className="h-4 w-4" strokeWidth={1.5} />
                {dl.label || "点击下载"}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 截图 */}
      {screenshots.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zinc-100 light:text-zinc-900">
            <span className="h-4 w-0.5 rounded-full bg-gradient-to-b from-blue-400 to-sky-400" />
            游戏截图
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {screenshots.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl ring-1 ring-white/[0.06] light:ring-black/[0.06] transition-all hover:ring-white/10 light:hover:ring-black/10">
                <Image src={src} alt={`截图 ${i + 1}`} width={600} height={400} className="w-full object-cover" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 更新日志 */}
      {game.logs.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200 light:text-zinc-800">
            <span className="h-4 w-0.5 rounded-full bg-gradient-to-b from-blue-400 to-sky-400" />
            更新日志
          </h2>
          <div className="space-y-2">
            {game.logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 rounded-xl bg-zinc-900 light:bg-zinc-100 px-4 py-3 ring-1 ring-white/[0.06] light:ring-black/[0.06]">
                <span className="mt-0.5 shrink-0 text-[10px] text-zinc-600 light:text-zinc-400">
                  {new Date(log.createdAt).toLocaleDateString("zh-CN")}
                </span>
                <p className="text-sm text-zinc-400 light:text-zinc-600">{log.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 评论区（Client Component） */}
      <CommentSection
        gameId={id}
        comments={game.comments.map((c) => ({
          id: c.id,
          content: c.content,
          imageUrl: c.imageUrl,
          likeCount: c.likeCount,
          createdAt: c.createdAt.toISOString(),
          user: c.user,
        }))}
        isLoggedIn={!!session?.user}
        currentUserId={session?.user?.id}
      />

      {/* 相关游戏 */}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200 light:text-zinc-800">
            <span className="h-4 w-0.5 rounded-full bg-gradient-to-b from-blue-400 to-sky-400" />
            相关游戏
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((g) => (
              <Link key={g.id} href={`/games/${g.id}`} className="group overflow-hidden rounded-xl bg-zinc-900 light:bg-white ring-1 ring-white/[0.06] light:ring-black/[0.06] transition-all hover:-translate-y-0.5 hover:ring-white/10 light:hover:ring-black/10">
                <div className="relative" style={{ aspectRatio: "4/3" }}>
                  {g.coverImage ? (
                    <Image src={g.coverImage} alt={g.title} fill className="object-cover transition-transform group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 light:bg-zinc-100 text-zinc-600 text-xs">暂无封面</div>
                  )}
                </div>
                <p className="truncate px-2.5 py-2 text-xs text-zinc-400 light:text-zinc-700 group-hover:text-zinc-200 light:group-hover:text-zinc-900 transition-colors">{g.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
