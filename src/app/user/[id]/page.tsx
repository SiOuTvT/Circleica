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
import { formatZhDate } from "@/lib/date"
import { Bookmark, Gamepad2, MessageSquare, Pencil } from "lucide-react"
import NextImage from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

async function resolveUser(id: string) {
  if (isNumericId(id)) {
    const numId = parseInt(id, 10)
    if (isNaN(numId) || numId <= 0) return null
    return prisma.user.findUnique({ where: { serialId: numId } })
  }
  return prisma.user.findUnique({ where: { id } })
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await resolveUser(id)
  if (user) {
    const description = user.bio?.replace(/<[^>]+>/g, "").slice(0, 160) || `${user.username} 的个人主页`
    return {
      title: `${user.username} · 同人游戏站`,
      description,
      openGraph: { title: `${user.username} · 同人游戏站`, description, images: ["/opengraph-image"] },
      alternates: { canonical: `/user/${user.serialId}` },
    }
  }
  return {
    title: "用户主页",
    description: "查看用户主页",
    openGraph: { title: "用户主页 · 同人游戏站", description: "查看用户主页", images: ["/opengraph-image"] },
    alternates: { canonical: `/user/${id}` },
  }
}

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const resolved = await resolveUser(id)
  if (!resolved) notFound()
  if (!isNumericId(id)) redirect(`/user/${resolved.serialId}`)

  let user: {
    id: string; serialId: number; uid: string | null; username: string; avatar: string | null;
    avatarFrameId: string | null; composedAvatarUrl: string | null; banner: string | null;
    bio: string | null; role: string; createdAt: Date;
    _count: { followers: number; following: number; favorites: number; comments: number; playStatuses: number }
  } | null = null
  try {
    // 只加载用户基本信息和数量统计，关联数据改为客户端按需加载
    user = await prisma.user.findUnique({
      where: { id: resolved.id },
      select: {
        id: true, serialId: true, uid: true, username: true, avatar: true,
        avatarFrameId: true, composedAvatarUrl: true, banner: true, bio: true,
        role: true, createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            favorites: true,
            comments: true,
            playStatuses: true
          }
        }
      },
    })
  } catch (error) { logger.db.error("[UserProfilePage] Database query failed", error) }
  if (!user) notFound()

  const userRank = user.serialId
  // 关联数据改为客户端按需加载，这里只传递数量统计
  const isSelf = session?.user?.id === user.id

  let isFollowing = false
  if (session?.user?.id && !isSelf) {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } }
    })
    isFollowing = !!existing
  }

  const joinDate = formatZhDate(user.createdAt)
  const uidDisplay = user.uid || String(user.serialId)

  return (
    <div className="flex flex-col">
      <BreadcrumbSetter segment={String(user.serialId)} label={user.username} />
      <div className="flex lg:flex-row flex-col items-stretch min-w-0 gap-0 flex-1">
        <aside className="w-full lg:w-[380px] lg:shrink-0 min-w-0 order-1 lg:order-none">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              {user.banner && (
                <div className="relative h-36 w-full overflow-hidden">
                  <NextImage src={user.banner} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 380px" loading="eager" />
                </div>
              )}
              <div className="px-4 sm:px-6 py-5 sm:py-8 flex flex-col items-center text-center">
                <div className={user.banner ? "-mt-16 sm:-mt-22 mb-4 sm:mb-5" : "mb-4 sm:mb-5"}>
                  <div className="relative h-[100px] w-[100px] sm:h-[130px] sm:w-[130px]">
                    {user.composedAvatarUrl ? (
                      <SafeAvatar src={user.composedAvatarUrl} alt={user.username} size={130} className="h-full w-full" />
                    ) : user.avatar ? (
                      <SafeAvatar src={user.avatar} alt={user.username} size={130} className="h-full w-full" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full text-2xl sm:text-4xl font-bold text-white" style={{ backgroundColor: getRandomAvatarColor(user.username) }}>
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{user.username}</h1>
                <div className="mt-2 flex items-center justify-center gap-2.5">
                  <span className="text-sm text-muted-foreground/60">UID {uidDisplay}</span>
                  {user.role === "SUPER_ADMIN" && (
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-sm font-medium text-amber-400 light:text-amber-600 ring-1 ring-amber-500/20">站长</span>
                  )}
                  {user.role === "ADMIN" && (
                    <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-sm font-medium text-blue-500 light:text-blue-600 ring-1 ring-blue-500/20">管理员</span>
                  )}
                  {user.role === "USER" && (
                    <span className="rounded-full bg-muted-foreground/10 px-2.5 py-1 text-sm font-medium text-muted-foreground ring-1 ring-muted-foreground/15">用户</span>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3 px-4">{user.bio || "这个人很懒，什么都没留下。"}</p>
                <div className="mt-4 sm:mt-6 flex items-center justify-center gap-8 sm:gap-12">
                  <div className="flex flex-col items-center"><span className="text-lg font-bold text-foreground">{user._count.following}</span><span className="text-xs text-muted-foreground mt-0.5">关注</span></div>
                  <div className="flex flex-col items-center"><span className="text-lg font-bold text-foreground">{user._count.followers}</span><span className="text-xs text-muted-foreground mt-0.5">粉丝</span></div>
                </div>
                <div className="mt-4 sm:mt-6 flex items-center justify-center gap-6 sm:gap-10">
                  <div className="flex flex-col items-center gap-1.5"><div className="flex items-center gap-1.5"><Bookmark className="h-4 w-4 text-primary" strokeWidth={2} /><span className="text-lg font-bold text-foreground">{user._count.favorites}</span></div><span className="text-xs text-muted-foreground">收藏</span></div>
                  <div className="flex flex-col items-center gap-1.5"><div className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-primary" strokeWidth={2} /><span className="text-lg font-bold text-foreground">{user._count.comments}</span></div><span className="text-xs text-muted-foreground">评论</span></div>
                  <div className="flex flex-col items-center gap-1.5"><div className="flex items-center gap-1.5"><Gamepad2 className="h-4 w-4 text-primary" strokeWidth={2} /><span className="text-lg font-bold text-foreground">{user._count.playStatuses}</span></div><span className="text-xs text-muted-foreground">玩过</span></div>
                </div>
                {!isSelf && session?.user && (
                  <div className="mt-6"><FollowButton targetUserId={user.id} initialFollowing={isFollowing} /></div>
                )}
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="px-5 py-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>第 {userRank} 位成员</span><span>{joinDate} 加入</span>
                </div>
                {isSelf && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link href="/profile/edit" className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary">
                      <Pencil className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                      <span className="text-xs font-medium text-foreground">编辑资料</span>
                    </Link>
                    {isSelf && (
                      <CardGenerateBtn data={{
                        username: user.username, uid: user.uid ?? "", avatar: user.avatar,
                        composedAvatarUrl: user.composedAvatarUrl ?? "", banner: user.banner,
                        bio: user.bio || "", role: user.role, createdAt: user.createdAt.toISOString(),
                        favCount: user._count.favorites, commentCount: user._count.comments,
                        followerCount: user._count.followers, followingCount: user._count.following,
                      }} />
                    )}
                    {/* AchievementModal 和 AvatarFrameSelector 有闪屏问题，暂时注释 */}
                    <AchievementModal compact />
                    <AvatarFrameSelector currentFrameId={user.avatarFrameId || null} userImage={user.composedAvatarUrl || user.avatar} userName={user.username} compact />
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
        <main className="w-full lg:w-[calc(100%-396px)] lg:shrink-0 flex flex-col lg:ml-4 min-w-0 order-2 lg:order-none">
          <div className="rounded-2xl bg-card h-full shadow-none relative z-10">
            <ProfileContentTabs
              userId={user.id}
            />
          </div>
        </main>
      </div>
    </div>
  )
}