import { AvatarFrame } from "@/components/avatar-frame"
import { AvatarFrameSelector } from "@/components/avatar-frame-selector"
import { BreadcrumbSetter } from "@/components/breadcrumb-setter"
import { FollowButton } from "@/components/follow-button"
import { ProfileContentTabs } from "@/components/profile-content-tabs"
import { ProfileMedalModal } from "@/components/profile-medal-modal"
import { SafeAvatar } from "@/components/safe-avatar"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRandomAvatarColor } from "@/lib/utils"
import { Bookmark, Gamepad2, MessageSquare, Pencil } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { username: true } })
  return { title: user ? `${user.username} · 同人游戏站` : "用户主页" }
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      favorites: {
        include: {
          game: { select: { id: true, title: true, coverImage: true, isNsfw: true } },
        },
      },
      playStatuses: {
        include: {
          game: { select: { id: true, title: true, coverImage: true, isNsfw: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { game: { select: { id: true, title: true } } },
      },
      _count: {
        select: {
          followers: true,
          following: true,
        }
      }
    },
  })

  if (!user) notFound()

  const userRank = await prisma.user.count({ where: { createdAt: { lte: user.createdAt } } })
  const favGames = user.favorites.map((f) => f.game)
  const allFavGames = user.favorites.map(f => f.game)
  const playStatusGames = user.playStatuses.map(p => ({ game: p.game, status: p.status }))
  const isSelf = session?.user?.id === id

  // Check if current user follows this user
  let isFollowing = false
  if (session?.user?.id && !isSelf) {
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: id,
        }
      }
    })
    isFollowing = !!existing
  }

  const joinDate = new Date(user.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, "/")

  // Calculate level for medal modal
  const totalActivity = allFavGames.length + user.playStatuses.length + user.comments.length
  let lv = 1
  if (totalActivity >= 100) lv = 10
  else if (totalActivity >= 60) lv = 9
  else if (totalActivity >= 35) lv = 8
  else if (totalActivity >= 20) lv = 7
  else if (totalActivity >= 10) lv = 5
  else if (totalActivity >= 3) lv = 3

  return (
    <div>
      <BreadcrumbSetter segment={id} label={user.username} />
      {/* 双栏布局：左窄右宽，两侧等高 */}
      <div className="flex lg:flex-row flex-col items-stretch min-w-0 gap-4 lg:gap-0">

        {/* ====== 左侧：用户信息（移动端在上方显示） ====== */}
        <aside className="w-full lg:w-[320px] lg:shrink-0 min-w-0 order-1 lg:order-none">
          <div className="flex flex-col gap-4">

            {/* 上层主卡片 - 身份区 */}
            <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)' }}>

              {/* Banner */}
              {user.banner && (
                <div className="h-28 w-full bg-cover bg-center" style={{ backgroundImage: `url(${user.banner})` }} />
              )}

              <div className="px-6 py-6 flex flex-col items-center text-center">

                {/* 头像（居中） */}
                <div className={user.banner ? "-mt-16 mb-4" : "mb-4"}>
                  <AvatarFrame frameId={(user as any).avatarFrame || "none"} size={96}>
                    {user.avatar ? (
                      <SafeAvatar
                        src={user.avatar}
                        alt={user.username}
                        size={96}
                        className="h-full w-full"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center rounded-full text-3xl font-bold text-white"
                        style={{ backgroundColor: getRandomAvatarColor(user.username) }}
                      >
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </AvatarFrame>
                </div>

                {/* 用户名 */}
                <h1 className="text-xl font-bold text-foreground tracking-tight">{user.username}</h1>

                {/* 个性签名 */}
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2 px-2">
                  {user.bio || "这个人很懒，什么都没留下。"}
                </p>

                {/* 关注 / 粉丝（增加间距） */}
                <div className="mt-5 flex items-center justify-center gap-10">
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
                <div className="mt-5 flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <Bookmark className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                      <span className="text-base font-bold text-foreground">{allFavGames.length}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">收藏</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                      <span className="text-base font-bold text-foreground">{user.comments.length}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">评论</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <Gamepad2 className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                      <span className="text-base font-bold text-foreground">{user.playStatuses.length}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">玩过</span>
                  </div>
                </div>

                {/* 关注按钮（非本人时显示） */}
                {!isSelf && session?.user && (
                  <div className="mt-5">
                    <FollowButton targetUserId={id} initialFollowing={isFollowing} />
                  </div>
                )}
              </div>
            </div>

            {/* 下层信息卡片 */}
            <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>

              <div className="px-5 py-4">
                {/* 第一行：成员序号 + 加入日期（字号调大） */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>第 {userRank} 位成员</span>
                  <span>{joinDate} 加入</span>
                </div>

                {/* 按钮区域（仅本人） */}
                {isSelf && (
                  <div className="mt-4 flex flex-col gap-2">
                    {/* 编辑资料（合并修改密码功能） */}
                    <Link href="/profile/edit" className="flex items-center gap-2.5 rounded-xl bg-secondary/60 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary">
                      <Pencil className="h-4 w-4 text-muted-foreground" strokeWidth={2} />编辑资料
                    </Link>

                    {/* 更换头像框 */}
                    <div className="rounded-xl bg-secondary/60 px-4 py-2.5">
                      <AvatarFrameSelector
                        currentFrame={(user as any).avatarFrame || "none"}
                        userImage={user.avatar}
                        userName={user.username}
                      />
                    </div>
                  </div>
                )}

                {/* 勋章墙按钮 */}
                <div className="mt-3">
                  <ProfileMedalModal
                    favCount={allFavGames.length}
                    playCount={user.playStatuses.length}
                    commentCount={user.comments.length}
                    totalLevel={lv}
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ====== 右侧：内容 Tab（移动端在下方显示） ====== */}
        <main className="w-full lg:w-[calc(100%-336px)] lg:shrink-0 flex flex-col lg:ml-4 min-w-0 order-2 lg:order-none">
          <div className="flex-1 rounded-2xl bg-card ring-1 ring-border overflow-y-auto"
            style={{ boxShadow: 'none', maxHeight: 'calc(100vh - 120px)' }}>
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