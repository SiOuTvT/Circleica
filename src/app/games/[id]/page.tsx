import { GalleryHero } from "@/components/gallery-hero"
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

  return (
    <div>
      <GameBreadcrumb gameId={id} gameTitle={game.title} />

      {/* ─── 第一层：视觉暴击区 — 左侧封面 30% + 右侧联动画廊 70% ─── */}
      {game.coverImage && (
        <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 sm:px-8 lg:pt-6">
          <GalleryHero
            coverImage={game.coverImage}
            gameTitle={game.title}
            screenshots={screenshots}
          />
        </div>
      )}

      {/* ─── 容器 — 移动端单栏纵向, PC 端 65/35 分栏 ─── */}
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:py-8 lg:grid lg:grid-cols-[65%_35%] lg:gap-10 lg:px-8">

        {/* ════════════════════════════════════════════
            左侧详情列 (移动端 100%, PC 65%)
            顺序：标题 > 信息带 > Tab > 内容
        ════════════════════════════════════════════ */}
        <div className="min-w-0">

          {/* 标题 — 24px, margin-top 20px */}
          <h1
            className="font-extrabold leading-tight text-foreground"
            style={{ fontSize: "24px", marginTop: "20px" }}
          >
            {game.title}
          </h1>
          {game.originalWork && (
            <p className="mt-1 text-sm text-muted-foreground">原作：{game.originalWork}</p>
          )}

          {/* 信息带 — SFW + 标签（同一行, wrap）+ 统计（下一行） */}
          <div className="mt-4 space-y-2">
            {/* SFW 纯文本 + 标签（紧跟, 不换行, wrap 自动换行） */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-block text-sm font-semibold"
                style={{ color: "var(--clr-blue)" }}
              >
                {game.isNsfw ? "NSFW" : "SFW"}
              </span>
              {paramTags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    color: "var(--clr-blue)",
                    background: "transparent",
                    border: "1px solid rgba(128, 243, 255, 0.35)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* 人气数据 — 小图标 UI，和游戏卡片一样 */}
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground/70">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                {game.viewCount}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground/70">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                {game.downloadCount}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground/70">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                {game.favoriteCount}
              </span>
              {/* VNDB 链接 */}
              {game.vndbId && (
                <a
                  href={`https://vndb.org/v${game.vndbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "var(--clr-blue)" }}
                >
                  VNDB
                </a>
              )}
            </div>
          </div>

          {/* Tab 导航 + 内容区 */}
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
          />
        </div>

        {/* ════════════════════════════════════════════
            右侧资源栏 (PC 35%, 移动端隐藏)
            Sticky, 卡片式背景
        ════════════════════════════════════════════ */}
        <aside className="hidden lg:block">
          <div
            className="sticky rounded-2xl p-6 space-y-5"
            style={{
              top: "40px",
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            {/* 文件大小 */}
            {fileSizes.length > 0 && (
              <div className="text-center">
                <span className="text-xs text-muted-foreground">文件大小</span>
                <p className="mt-1 text-lg font-bold text-foreground flex items-center justify-center gap-0.5">
                  {fileSizes.map((fs, i) => (
                    <span key={i} className="flex items-center">
                      <span>{fs.value} {fs.unit}</span>
                      {i < fileSizes.length - 1 && <span className="mx-1 text-muted-foreground/40">/</span>}
                    </span>
                  ))}
                </p>
              </div>
            )}

            {/* 运行参数 */}
            {(platformTags.length > 0 || languageTags.length > 0) && (
              <div className="space-y-3">
                {platformTags.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">平台</span>
                    <div className="flex flex-wrap gap-1.5">
                      {platformTags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-border bg-secondary text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {languageTags.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">语言</span>
                    <div className="flex flex-wrap gap-1.5">
                      {languageTags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-border bg-secondary text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
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

            {/* 下载按钮 — 主题色实色填充 */}
            {downloadLinks.length > 0 && (
              <div className="space-y-2">
                {downloadLinks.map((dl, i) => (
                  <a
                    key={i}
                    href={dl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "var(--clr-blue)" }}
                  >
                    {dl.label || "下载"}
                  </a>
                ))}
              </div>
            )}

            {/* 创作者 */}
            {creators.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground">创作者</h3>
                {creators.map((c) => (
                  <a
                    key={`${c.id}-${c.role}`}
                    href={`/creators/${c.id}`}
                    className="flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-secondary"
                  >
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.name} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, var(--clr-sky), var(--clr-blue))" }}
                      >
                        {(c.nameJa || c.name)[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.nameJa || c.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {{ scenario: "脚本", art: "原画", chardesign: "角色设计", director: "导演", music: "音乐", songs: "主题曲" }[c.role] ?? c.role}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}