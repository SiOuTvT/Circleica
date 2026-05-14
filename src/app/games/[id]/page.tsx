import { GameBreadcrumb } from "@/components/game-breadcrumb"
import { GameDetailClient } from "@/components/game-detail-client"
import { GameDetailTopClient } from "@/components/game-detail-top-client"
import { GameGallery } from "@/components/game-gallery"
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
    },
  })

  if (!game) notFound()

  // 增加浏览量
  prisma.game.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  const tags = game.tags.map((t) => t.tag)
  const screenshots: string[] = JSON.parse(game.screenshots || "[]")
  const downloadLinks: { label: string; url: string }[] = JSON.parse(game.downloadLinks || "[]")

  let isFav = false
  if (session?.user?.id) {
    const fav = await prisma.favorite.findUnique({
      where: { userId_gameId: { userId: session.user.id, gameId: id } },
    })
    isFav = !!fav
  }

  /* 解析 JSON 数组（兼容旧格式纯文本） */
  function parseArr(raw: string): string[] {
    if (!raw) return []
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.filter(Boolean).map(String) } catch {}
    return raw.split(/[,，/、]/).map(s => s.trim()).filter(Boolean)
  }
  type FileSizeEntry = { value: string; unit: string }
  function parseFileSizes(raw: string): FileSizeEntry[] {
    if (!raw) return []
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.filter(e => e.value) } catch {}
    const parts = raw.split(/[/、,，]/).map(s => s.trim()).filter(Boolean)
    return parts.map(part => {
      const m = part.match(/([\d.]+)\s*(MB|GB)/i)
      if (m) return { value: m[1], unit: m[2].toUpperCase() }
      return { value: part, unit: "GB" }
    })
  }

  const platformTags = parseArr(game.platform)
  const languageTags = parseArr(game.language)
  const paramTags = [...platformTags, ...languageTags]
  const fileSizes = parseFileSizes(game.fileSize)

  const creators = game.creators.map((gc) => ({
    id: gc.creator.id,
    name: gc.creator.name,
    nameJa: gc.creator.nameJa,
    avatar: gc.creator.avatar,
    role: gc.role,
  }))

  // 取第一个创作者作为主要发布者
  const primaryCreator = creators[0]

  // 计算发布时间相对描述
  const now = new Date()
  const diffMs = now.getTime() - game.createdAt.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  let timeAgo: string
  if (diffDays === 0) timeAgo = "今天发布"
  else if (diffDays === 1) timeAgo = "昨天发布"
  else if (diffDays < 30) timeAgo = `${diffDays}天前发布`
  else if (diffDays < 365) timeAgo = `${Math.floor(diffDays / 30)}个月前发布`
  else timeAgo = `${Math.floor(diffDays / 365)}年前发布`

  // JSON-LD 结构化数据
  const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": game.title,
    "description": game.description?.slice(0, 300) || `${game.originalWork || ""} 同人游戏`,
    "image": game.coverImage || undefined,
    "url": `${BASE}/games/${id}`,
    "applicationCategory": "Game",
    "genre": tags.map(t => t.name).join(", "),
    "datePublished": game.createdAt.toISOString(),
    "dateModified": game.updatedAt.toISOString(),
    "interactionStatistic": [
      { "@type": "InteractionCounter", "interactionType": "https://schema.org/LikeAction", "userInteractionCount": game.favoriteCount },
      { "@type": "InteractionCounter", "interactionType": "https://schema.org/ViewAction", "userInteractionCount": game.viewCount },
    ],
    ...(primaryCreator ? { "author": { "@type": "Organization", "name": primaryCreator.name } } : {}),
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GameBreadcrumb gameId={id} gameTitle={game.title} />

      {/* ═══════════════════════════════════════════════
          顶部双塔区 — 左 38% + 右 62%，底边齐平 520px
      ═══════════════════════════════════════════════ */}
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 sm:px-8 lg:pt-6">
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[38%_1fr]">

          {/* ─── 左侧垂直双叠片 ─── */}
          <div className="flex flex-col" style={{ minHeight: "400px" }}>

            {/* 上卡片：封面 3:2 = 320px */}
            <div
              className="relative overflow-hidden flex-1 min-h-[220px] sm:min-h-[280px]"
              style={{
                borderRadius: "16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              {game.coverImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={game.coverImage}
                    alt={game.title}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                  {/* 底部渐变遮罩显示标题 */}
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-end p-4"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)", height: "50%" }}
                  >
                    <div>
                      <h1
                        className="font-black leading-tight drop-shadow-lg"
                        style={{ fontSize: "32px", color: "#000000", fontWeight: 900 }}
                      >
                        {game.title}
                      </h1>
                      {game.originalWork && (
                        <p className="mt-1 text-xs text-white/70">原作：{game.originalWork}</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary">
                  <span className="text-muted-foreground/40 text-sm">暂无封面</span>
                </div>
              )}
            </div>

            {/* 中间缝隙 20px — 由 gap-5 (20px) 提供 */}

            {/* 下卡片：作者与交互 180px */}
            <div
              className="flex flex-col justify-between p-5"
              style={{
                height: "180px",
                borderRadius: "16px",
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              }}
            >
              {/* 作者信息 */}
              <div className="flex items-center gap-3">
                {primaryCreator?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primaryCreator.avatar}
                    alt={primaryCreator.name}
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg, var(--clr-sky), var(--clr-blue))" }}
                  >
                    {primaryCreator ? (primaryCreator.nameJa || primaryCreator.name)[0] : "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {primaryCreator ? (primaryCreator.nameJa || primaryCreator.name) : "未知创作者"}
                  </p>
                  <p className="text-xs text-muted-foreground/60">{timeAgo}</p>
                </div>
              </div>

              {/* 人气统计 + 信息标签 */}
              <div className="space-y-2">
                {/* 标签行 */}
                {paramTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="inline-block text-xs font-semibold"
                      style={{ color: "var(--clr-blue)" }}
                    >
                      {game.isNsfw ? "NSFW" : "SFW"}
                    </span>
                    {paramTags.slice(0, 4).map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          color: "var(--clr-blue)",
                          background: "transparent",
                          border: "1px solid rgba(128, 243, 255, 0.25)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 人气数据 — 放大 */}
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span className="font-bold">{game.viewCount}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    <span className="font-bold">{game.downloadCount}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground/70">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                    <span className="font-bold">{game.favoriteCount}</span>
                  </span>
                </div>
              </div>

              {/* 功能按钮行 */}
              <GameDetailTopClient
                gameId={id}
                downloadLinks={downloadLinks}
                isFav={isFav}
                favCount={game.favoriteCount}
                isLoggedIn={!!session?.user}
              />
            </div>
          </div>

          {/* ─── 右侧巨幕与画廊（通过 GameGallery 管理联动状态）─── */}
          <GameGallery screenshots={screenshots} gameTitle={game.title} />

        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          下方内容区 — Tab 式详情
      ═══════════════════════════════════════════════ */}
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
          <GameDetailClient
            description={game.description}
            screenshots={screenshots}
            downloadLinks={downloadLinks}
            creators={creators}
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
            gameId={id}
            isFav={isFav}
            favCount={game.favoriteCount}
            fileSizes={fileSizes}
            platformTags={platformTags}
            languageTags={languageTags}
            gameTags={game.tags.map((gt) => ({ name: gt.tag.name, color: gt.tag.color }))}
            viewCount={game.viewCount}
            downloadCount={game.downloadCount}
            vndbId={game.vndbId || undefined}
            releaseDate={(game as any).releaseDate ? new Date((game as any).releaseDate).toLocaleDateString("zh-CN") : undefined}
            gameDuration={(game as any).gameDuration || undefined}
            studioName={(game as any).studioName || undefined}
          />
      </div>
    </div>
  )
}