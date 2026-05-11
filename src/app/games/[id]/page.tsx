import { CommentSection } from "@/components/comment-section"
import { GameBreadcrumb } from "@/components/game-breadcrumb"
import { GameDetailClient } from "@/components/game-detail-client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
    <div>
      <GameBreadcrumb gameId={id} gameTitle={game.title} />

      {/* 全宽封面 Banner — 16:9, 0px 圆角 */}
      {game.coverImage && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <img
            src={game.coverImage}
            alt={game.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>
      )}

      {/* 容器 — 移动端单栏, PC 端 65/35 分栏 */}
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 lg:grid lg:grid-cols-[65%_35%] lg:gap-10 lg:px-8">

        {/* ─── 左侧详情列 (移动端 100%, PC 65%) ─── */}
        <div className="min-w-0">

          {/* 标题 */}
          <h1
            className="font-extrabold leading-tight text-foreground"
            style={{ fontSize: "24px", marginTop: "20px" }}
          >
            {game.title}
          </h1>
          {game.originalWork && (
            <p className="mt-1 text-sm text-muted-foreground">原作：{game.originalWork}</p>
          )}

          {/* 信息带 — SFW + 标签 + 统计 */}
          <div className="mt-4 space-y-3">
            {/* SFW 纯文本 */}
            <span
              className="inline-block text-sm font-semibold"
              style={{ color: "#80F3FF" }}
            >
              {game.isNsfw ? "NSFW" : "SFW"}
            </span>

            {/* 标签 — flex-wrap, 1px 细边框, 自动换行 */}
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag.name}
                  className="inline-block rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    color: tag.color,
                    background: "transparent",
                    border: `1px solid ${tag.color}60`,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>

            {/* 统计数据 — 灰字小样 */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {game.status && (
                <span>{game.status}</span>
              )}
              <span>{game.viewCount} 次浏览</span>
              <span>{game.favoriteCount} 收藏</span>
              <span>{new Date(game.createdAt).toLocaleDateString("zh-CN")}</span>
              {game.vndbId && (
                <a
                  href={`https://vndb.org/v${game.vndbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  style={{ color: "#80F3FF" }}
                >
                  VNDB
                </a>
              )}
            </div>
          </div>

          {/* Tab 导航 + 内容区 — 客户端组件 */}
          <GameDetailClient
            description={game.description}
            screenshots={screenshots}
            creators={game.creators.map(gc => ({
              id: gc.creator.id,
              name: gc.creator.name,
              nameJa: gc.creator.nameJa,
              avatar: gc.creator.avatar,
              role: gc.role,
            }))}
            logs={game.logs.map(l => ({
              id: l.id,
              content: l.content,
              createdAt: l.createdAt.toISOString(),
            }))}
          />

          {/* 评论区 */}
          <div className="mt-8">
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
          </div>

          {/* 相关游戏 */}
          {related.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold text-foreground">相关游戏</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {related.map((g) => (
                  <a key={g.id} href={`/games/${g.id}`} className="group overflow-hidden rounded-xl transition-all hover:-translate-y-0.5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                    <div className="relative" style={{ aspectRatio: "4/3" }}>
                      {g.coverImage ? (
                        <img src={g.coverImage} alt={g.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">暂无封面</div>
                      )}
                    </div>
                    <p className="truncate px-2.5 py-2 text-xs text-muted-foreground group-hover:text-foreground transition-colors">{g.title}</p>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ─── 右侧资源栏 (PC 35%, 移动端隐藏) ─── */}
        <aside className="hidden lg:block">
          <div
            className="sticky rounded-2xl p-6 space-y-5"
            style={{
              top: "40px",
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            {/* 封面缩略图 */}
            {game.coverImage && (
              <div className="overflow-hidden rounded-xl" style={{ aspectRatio: "4/5" }}>
                <img src={game.coverImage} alt={game.title} className="h-full w-full object-cover" />
              </div>
            )}

            {/* 文件大小 — 全站唯一出现处 */}
            {game.fileSize && (
              <div className="text-center">
                <span className="text-xs text-muted-foreground">文件大小</span>
                <p className="mt-1 text-lg font-bold text-foreground">{game.fileSize}</p>
              </div>
            )}

            {/* 运行参数 */}
            {(game.platform || game.language) && (
              <div className="space-y-2">
                {game.platform && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">平台</span>
                    <span className="text-foreground">{game.platform}</span>
                  </div>
                )}
                {game.language && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">语言</span>
                    <span className="text-foreground">{game.language}</span>
                  </div>
                )}
              </div>
            )}

            {/* 统计 */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-lg font-bold text-foreground">{game.viewCount}</p>
                <p className="text-[11px] text-muted-foreground">浏览</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-lg font-bold text-foreground">{game.favoriteCount}</p>
                <p className="text-[11px] text-muted-foreground">收藏</p>
              </div>
            </div>

            {/* 下载按钮 — 薄荷青实色填充 */}
            {downloadLinks.length > 0 && (
              <div className="space-y-2">
                {downloadLinks.map((dl, i) => (
                  <a
                    key={i}
                    href={dl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#80F3FF" }}
                  >
                    {dl.label || "下载"}
                  </a>
                ))}
              </div>
            )}

            {/* 创作者 */}
            {game.creators.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">创作者</h3>
                {game.creators.map(gc => (
                  <a
                    key={`${gc.creatorId}-${gc.role}`}
                    href={`/creators/${gc.creatorId}`}
                    className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-secondary"
                  >
                    {gc.creator.avatar ? (
                      <img src={gc.creator.avatar} alt={gc.creator.name} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #80F3FF, #06b6d4)" }}>
                        {(gc.creator.nameJa || gc.creator.name)[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{gc.creator.nameJa || gc.creator.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {{ scenario:"脚本", art:"原画", chardesign:"角色设计", director:"导演", music:"音乐", songs:"主题曲" }[gc.role] ?? gc.role}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2">
              <a
                href="#comments"
                className="flex-1 rounded-xl bg-secondary py-2.5 text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                评论 ({game.comments.length})
              </a>
              <button
                className="flex-1 rounded-xl py-2.5 text-xs font-medium text-black transition-opacity hover:opacity-90"
                style={{ backgroundColor: isFav ? "#80F3FF" : "hsl(var(--secondary))", color: isFav ? "#000" : "hsl(var(--muted-foreground))" }}
              >
                {isFav ? "已收藏" : "收藏"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}