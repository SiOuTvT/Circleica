import { AchievementModal } from "@/components/achievement-modal"
import { AvatarFrameSelector } from "@/components/avatar-frame-selector"
import { BreadcrumbSetter } from "@/components/breadcrumb-setter"
import { CardGenerateBtn } from "@/components/card-generate-btn"
import { FollowButton } from "@/components/follow-button"
import { ProfileContentTabs } from "@/components/profile-content-tabs"
import { SafeAvatar } from "@/components/safe-avatar"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { isNumericId } from "@/lib/serial-id"
import { getRandomAvatarColor } from "@/lib/utils"
import { Bookmark, Gamepad2, Image as ImageIcon, MessageSquare, Pencil } from "lucide-react"
import NextImage from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

/**
 * 用户主页 — 支持两种 URL 格式：
 *   /user/00001   (serialId / uid，新格式)
 *   /user/clxxx   (cuid，旧格式 → 301 重定向到 serialId URL)
 */

// ── 查找用户：优先 serialId，回退 cuid ──────────────────────────────
async function resolveUser(id: string) {
  if (isNumericId(id)) {
    // 数字 → 按 serialId 查找
    const numId = parseInt(id, 10)
    if (isNaN(numId) || numId <= 0) return null
    return prisma.user.findUnique({ where: { serialId: numId } })
  }
  // 非数字 → 当作 cuid 查找
  return prisma.user.findUnique({ where: { id } })
}

// ── SEO Metadata ────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await resolveUser(id)
  return { title: user ? `${user.username} · 同人游戏站` : "用户主页" }
}

// ── 页面组件 ────────────────────────────────────────────────────────
export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  // 查找用户
  const resolved = await resolveUser(id)
  if (!resolved) notFound()

  // 如果是 cuid 格式访问 → 301 重定向到 serialId URL
  if (!isNumericId(id)) {
    redirect(`/user/${resolved.serialId}`)
  }

  // 用 cuid 查询完整数据（因为 include 需要 id 字段）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let user: any = null // Prisma include 返回的复杂类型
  try {
    user = await prisma.user.findUnique({
      where: { id: resolved.id },
      select: {
        id: true, serialId: true, uid: true, username: true, avatar: true,
        avatarFrameId: true, composedAvatarUrl: true, banner: true, bio: true,
        role: true, createdAt: true,
        favorites: {
          include: {
            game: { select: { id: true, serialId: true, title: true, coverImage: true, isNsfw: true } },
          },
        },
        playStatuses: {
          include: {
            game: { select: { id: true, serialId: true, title: true, coverImage: true, isNsfw: true } },
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          include: { game: { select: { id: true, serialId: true, title: true } } },
        },
        _count: {
          select: {
            followers: true,
            following: true,
          }
        }
      },
    })
  } catch (error) {
    logger.db.error("[UserProfilePage] Database query failed", error)
  }

  if (!user) notFound()

  // 使用 serialId 作为排名（自增 ID 近似等于注册顺序，避免 O(n) count 查询）
  const userRank = user.serialId
  const favGames = user.favorites.map((f: { game: unknown }) => f.game)
  const playStatusGames = user.playStatuses.map((p: { game: unknown; status: string }) => ({ game: p.game, status: p.status }))
  const isSelf = session?.user?.id === user.id

  // Check if current user follows this user
  let isFollowing = false
  if (session?.user?.id && !isSelf) {
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: user.id,
        }
      }
    })
    isFollowing = !!existing
  }

  const joinDate = new Date(user.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const uidDisplay = user.uid || String(user.serialId)

  return (
    <div className="flex flex-col">
      <BreadcrumbSetter segment={String(user.serialId)} label={user.username} />
      {/* 双栏布局：左窄右宽，两侧等高 */}
      <div className="flex lg:flex-row flex-col items-stretch min-w-0 gap-4 lg:gap-0 flex-1">

        {/* ====== 左侧：用户信息（移动端在上方显示） ====== */}
        <aside className="w-full lg:w-[380px] lg:shrink-0 min-w-0 order-1 lg:order-none">
          <div className="flex flex-col gap-4">

            {/* 上层主卡片 - 身份区 */}
            <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
              style={{ boxShadow: 'var(--card-shadow-hover)' }}>

              {/* Banner */}
              {user.banner && (
                <div className="relative h-36 w-full overflow-hidden">
                  <NextImage
                    src={user.banner}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 380px"
                    loading="eager"
                  />
                </div>
              )}

              <div className="px-6 py-8 flex flex-col items-center text-center">

                {/* 头像（居中） */}
                <div className={user.banner ? "-mt-16 sm:-mt-22 mb-4 sm:mb-5" : "mb-4 sm:mb-5"}>
                  <div className="relative h-[100px] w-[100px] sm:h-[130px] sm:w-[130px]">
                    {/* 优先使用合成头像，回退到原始头像 */}
                    {user.composedAvatarUrl ? (
                      <SafeAvatar
                        src={user.composedAvatarUrl}
                        alt={user.username}
                        size={130}
                        className="h-full w-full"
                      />
                    ) : user.avatar ? (
                      <SafeAvatar
                        src={user.avatar}
                        alt={user.username}
                        size={130}
                        className="h-full w-full"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center rounded-full text-2xl sm:text-[2.8rem] font-bold text-white"
                        style={{ backgroundColor: getRandomAvatarColor(user.username) }}
                      >
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* 用户名 */}
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{user.username}</h1>

                {/* UID + 角色标签 */}
                <div className="mt-2 flex items-center justify-center gap-2.5">
                  <span className="text-[13px] text-muted-foreground/60">
                    UID {uidDisplay}
                  </span>
                  {user.role === "SUPER_ADMIN" && (
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[13px] font-medium text-amber-500 light:text-amber-600 ring-1 ring-amber-500/20">
                      站长
                    </span>
                  )}
                  {user.role === "ADMIN" && (
                    <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[13px] font-medium text-blue-500 light:text-blue-600 ring-1 ring-blue-500/20">
                      管理员
                    </span>
                  )}
                  {user.role === "USER" && (
                    <span className="rounded-full bg-muted-foreground/10 px-2.5 py-1 text-[13px] font-medium text-muted-foreground ring-1 ring-muted-foreground/15">
                      用户
                    </span>
                  )}
                </div>

                {/* 个性签名 */}
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3 px-4">
                  {user.bio || "这个人很懒，什么都没留下。"}
                </p>

                {/* 关注 / 粉丝（增加间距） */}
                <div className="mt-4 sm:mt-6 flex items-center justify-center gap-8 sm:gap-12">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-foreground">{user._count.following}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">关注</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-foreground">{user._count.followers}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">粉丝</span>
                  </div>
                </div>

                {/* 收藏 / 评论 / 玩过（带图标，间距增大） */}
                <div className="mt-4 sm:mt-6 flex items-center justify-center gap-6 sm:gap-10">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Bookmark className="h-4 w-4 text-primary" strokeWidth={2.5} />
                      <span className="text-lg font-bold text-foreground">{favGames.length}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">收藏</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-primary" strokeWidth={2.5} />
                      <span className="text-lg font-bold text-foreground">{user.comments.length}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">评论</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Gamepad2 className="h-4 w-4 text-primary" strokeWidth={2.5} />
                      <span className="text-lg font-bold text-foreground">{user.playStatuses.length}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">玩过</span>
                  </div>
                </div>

                {/* 关注按钮（非本人时显示） */}
                {!isSelf && session?.user && (
                  <div className="mt-6">
                    <FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
                  </div>
                )}
              </div>
            </div>

            {/* 下层信息卡片 */}
            <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
              style={{ boxShadow: 'var(--card-shadow)' }}>

              <div className="px-5 py-4">
                {/* 成员信息 */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>第 {userRank} 位成员</span>
                  <span>{joinDate} 加入</span>
                </div>

                {/* 操作网格（仅本人） */}
                {isSelf && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {/* 编辑资料 */}
                    <Link
                      href="/profile/edit"
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary"
                    >
                      <Pencil className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                      <span className="text-xs font-medium text-foreground">编辑资料</span>
                    </Link>

                    {/* 生成名片 */}
                    {isSelf && (
                      <CardGenerateBtn data={{
                        username: user.username,
                        uid: user.uid,
                        avatar: user.avatar,
                        composedAvatarUrl: user.composedAvatarUrl,
                        banner: user.banner,
                        bio: user.bio || "",
                        role: user.role,
                        createdAt: user.createdAt.toISOString(),
                        favCount: user.favorites.length,
                        commentCount: user.comments.length,
                        followerCount: user._count.followers,
                        followingCount: user._count.following,
                      }} />
                    )}
                    {/* 非本人时显示占位 */}
                    {!isSelf && (
                      <button
                        className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <ImageIcon className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                        <span className="text-xs font-medium text-foreground">生成名片</span>
                      </button>
                    )}

                    {/* 成就 */}
                    <AchievementModal compact />

                    {/* 头像框 */}
                    <AvatarFrameSelector
                      currentFrameId={user.avatarFrameId || null}
                      userImage={user.composedAvatarUrl || user.avatar}
                      userName={user.username}
                      compact
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ====== 右侧：内容 Tab（移动端在下方显示） ====== */}
        <main className="w-full lg:w-[calc(100%-396px)] lg:shrink-0 flex flex-col lg:ml-4 min-w-0 order-2 lg:order-none">
          <div className="rounded-2xl bg-card ring-1 ring-border h-full shadow-none">
            <ProfileContentTabs
              favGames={favGames}
              playStatusGames={playStatusGames}
              comments={user.comments}
            />
          </div>
        </main>
      </div>
    </div>
  )
}