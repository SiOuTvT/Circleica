import { AvatarFrame } from "@/components/avatar-frame"
import { AvatarFrameSelector } from "@/components/avatar-frame-selector"
import { FollowButton } from "@/components/follow-button"
import { ProfileContentTabs } from "@/components/profile-content-tabs"
import { ProfileMedalModal } from "@/components/profile-medal-modal"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRandomAvatarColor } from "@/lib/utils"
import { KeyRound, Pencil, Star } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { username: true } })
  return { title: user ? `${user.username} · 同人游戏站` : "用户主页" }
}

function calcLevel(favCount: number, playCount: number, commentCount: number) {
  const total = favCount + playCount + commentCount
  if (total >= 100) return { lv: 10, label: "传奇玩家" }
  if (total >= 60)  return { lv: 9,  label: "资深玩家" }
  if (total >= 35)  return { lv: 8,  label: "老玩家" }
  if (total >= 20)  return { lv: 7,  label: "活跃玩家" }
  if (total >= 10)  return { lv: 5,  label: "普通玩家" }
  if (total >= 3)   return { lv: 3,  label: "新手玩家" }
  return { lv: 1, label: "萌新" }
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
  const { lv, label } = calcLevel(allFavGames.length, user.playStatuses.length, user.comments.length)
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

  const faveGame = user.faveGameId
    ? await prisma.game.findUnique({ where: { id: user.faveGameId }, select: { id: true, title: true, coverImage: true, originalWork: true } })
    : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* 4:6 双栏布局 */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ====== 左侧 40%：双层卡片 ====== */}
        <aside className="w-full lg:w-[40%] lg:shrink-0 flex flex-col gap-4">

          {/* 上层大卡 - 身份区 */}
          <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)' }}>

            {/* Banner */}
            {user.banner && (
              <div className="h-24 w-full bg-cover bg-center sm:h-32" style={{ backgroundImage: `url(${user.banner})` }} />
            )}

            <div className="p-5 flex flex-col items-center text-center">

              {/* 圆形头像 */}
              <div className={user.banner ? "-mt-14 mb-3" : "mb-3"}>
                <AvatarFrame frameId={(user as any).avatarFrame || "none"} size={88}>
                  {user.avatar ? (
                    <img
                      src={`${user.avatar}${user.avatar.includes('?') ? '&' : '?'}t=${Date.now()}`}
                      alt={user.username}
                      className="h-full w-full object-cover rounded-full"
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

              {/* ID */}
              <h1 className="text-lg font-bold text-foreground tracking-tight">{user.username}</h1>

              {/* 等级标签 */}
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-0.5 text-xs text-violet-400">
                <Star className="h-3 w-3" strokeWidth={2} />
                LV.{lv} · {label}
              </div>

              {/* 个人签名 */}
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {user.bio || "这个人很懒，什么都没留下。"}
              </p>

              {/* 社交行1：关注 / 粉丝 */}
              <div className="mt-4 flex items-center justify-center gap-8">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-foreground">{user._count.following}</span>
                  <span className="text-[11px] text-muted-foreground">关注</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-foreground">{user._count.followers}</span>
                  <span className="text-[11px] text-muted-foreground">粉丝</span>
                </div>
              </div>

              {/* 社交行2：收藏 / 评论 / 玩过 */}
              <div className="mt-3 flex items-center justify-center gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-base font-bold text-foreground">{allFavGames.length}</span>
                  <span className="text-[11px] text-muted-foreground">收藏</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base font-bold text-foreground">{user.comments.length}</span>
                  <span className="text-[11px] text-muted-foreground">评论</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base font-bold text-foreground">{user.playStatuses.length}</span>
                  <span className="text-[11px] text-muted-foreground">玩过</span>
                </div>
              </div>

              {/* 关注按钮（非本人时显示） */}
              {!isSelf && session?.user && (
                <div className="mt-4">
                  <FollowButton targetUserId={id} initialFollowing={isFollowing} />
                </div>
              )}
            </div>
          </div>

          {/* 下层小卡 - 功能区 */}
          <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>

            <div className="p-4">
              {/* 入站序号 + 加入日期 */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3 px-1">
                <span>第 {userRank} 位成员</span>
                <span>{new Date(user.createdAt).toLocaleDateString("zh-CN")} 加入</span>
              </div>

              {/* 编辑资料 / 修改密码 / 更换头像框（仅本人） */}
              {isSelf && (
                <div className="flex flex-col gap-2">
                  <Link href="/profile/edit" className="flex items-center gap-2.5 rounded-xl bg-secondary/60 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary">
                    <Pencil className="h-4 w-4 text-muted-foreground" strokeWidth={2} />编辑资料
                  </Link>
                  <Link href="/profile/edit#password" className="flex items-center gap-2.5 rounded-xl bg-secondary/60 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary">
                    <KeyRound className="h-4 w-4 text-muted-foreground" strokeWidth={2} />修改密码
                  </Link>
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
        </aside>

        {/* ====== 右侧 60%：内容实验室 ====== */}
        <main className="w-full lg:w-[60%]">
          <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)' }}>
            <ProfileContentTabs
              faveGame={faveGame ?? null}
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