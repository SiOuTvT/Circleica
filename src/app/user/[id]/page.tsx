import { AchievementModal } from "@/components/achievement-modal"
import { AvatarFrameSelector } from "@/components/avatar-frame-selector"
import { BreadcrumbSetter } from "@/components/breadcrumb-setter"
import { CardGenerateBtn } from "@/components/card-generate-btn"
import { FollowButton } from "@/components/follow-button"
import { ProfileContentTabs } from "@/components/profile-content-tabs"
import { SafeAvatar } from "@/components/safe-avatar"
import { StartConversationButton } from "@/components/start-conversation-button"
import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { isNumericId } from "@/lib/serial-id"
import { getRandomAvatarColor } from "@/lib/utils"
import { ROLE_META, type UserRole } from "@/lib/permissions"
import { formatZhDate } from "@/lib/date"
import { Bookmark, MessageSquare, Pencil } from "lucide-react"
import NextImage from "next/image"
import Link from "next/link"
import { cache as reactCache } from "react"
import { notFound, redirect } from "next/navigation"

const resolveUser = reactCache(async (id: string) => {
  const select = { id: true, serialId: true, username: true, bio: true }
  if (isNumericId(id)) {
    const numId = parseInt(id, 10)
    if (isNaN(numId) || numId <= 0) return null
    return prisma.user.findUnique({ where: { serialId: numId }, select })
  }
  return prisma.user.findUnique({ where: { id }, select })
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await resolveUser(id)
  if (user) {
    const description = user.bio?.replace(/<[^>]+>/g, "").slice(0, 160) || `${user.username} 的个人主页`
    return {
      title: `${user.username} · Circleica`,
      description,
      openGraph: { title: `${user.username} · Circleica`, description, images: ["/opengraph-image"] },
      alternates: { canonical: `/user/${user.serialId}` },
    }
  }
  return {
    title: "用户主页",
    description: "查看用户主页",
    openGraph: { title: "用户主页 · Circleica", description: "查看用户主页", images: ["/opengraph-image"] },
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
    bio: string | null; role: string; createdAt: Date; marksSpent: number;
    avatarFrame: { imageUrl: string } | null;
    _count: { followers: number; following: number; favorites: number; comments: number }
  } | null = null
  try {
    // 只加载用户基本信息和数量统计，关联数据改为客户端按需加载
    user = await prisma.user.findUnique({
      where: { id: resolved.id },
      select: {
        id: true, serialId: true, uid: true, username: true, avatar: true,
        avatarFrameId: true, composedAvatarUrl: true, banner: true, bio: true,
        role: true, createdAt: true, marksSpent: true,
        avatarFrame: { select: { imageUrl: true } },
        _count: {
          select: {
            followers: true,
            following: true,
            favorites: true,
            comments: true
          }
        }
      },
    })
  } catch (error) { logger.db.error("[UserProfilePage] Database query failed", error) }
  if (!user) notFound()

  // 名片数据：收藏游戏封面 + 关注的人 + 收藏偏好标签，供生成精美竖版名片使用
  let cardData: {
    favoriteGames: Array<{ id: string; title: string; coverImage: string | null; serialId: number; isNsfw: boolean }>
    followingUsers: Array<{ id: string; username: string; avatar: string | null; composedAvatarUrl: string | null }>
    favoriteTags: Array<{ name: string; color: string; count: number }>
    favoriteTotal: number
    favoriteStudios: Array<{ displayName: string; count: number }>
    favoriteYears: Array<{ year: number; count: number }>
    favoritePlatforms: Array<{ platform: string; count: number }>
    checkinHeat: number[]
    marksTotal: number
    collections: Array<{
      id: string; name: string; description: string | null;
      covers: Array<string | null>; count: number
    }>
    achievements: Array<{ id: string; name: string; icon: string | null; category: string }>
  } = {
    favoriteGames: [], followingUsers: [], favoriteTags: [],
    favoriteTotal: 0, favoriteStudios: [], favoriteYears: [], favoritePlatforms: [],
    checkinHeat: [], marksTotal: 0, collections: [], achievements: [],
  }

  // ── 名片数据查询（v2 高密度档案） ──
  // 铁律：展示封面（take 8）与全部收藏统计（allFavIds）严格分离，互不混用。
  try {
    // 1. 展示封面：最多 8 张，仅用于封面渲染
    const favoriteGames = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { game: { select: { id: true, title: true, coverImage: true, serialId: true, isNsfw: true } } },
    })

    // 2. 全部收藏的 gameId 集合（统计用，无 take）
    const allFavIds = await prisma.favorite.findMany({
      where: { userId: user.id },
      select: { gameId: true },
    })
    const ids = allFavIds.map((f) => f.gameId)

    cardData.favoriteGames = favoriteGames.map((f) => f.game)
    cardData.favoriteTotal = allFavIds.length

    // 3. 偏好标签（基于全部收藏）
    if (ids.length > 0) {
      const favGames = await prisma.gameTag.findMany({
        where: { gameId: { in: ids } },
        select: { tag: { select: { name: true, color: true } } },
      })
      const tagCount = new Map<string, { name: string; color: string; count: number }>()
      for (const { tag } of favGames) {
        const cur = tagCount.get(tag.name)
        if (cur) { cur.count++ }
        else { tagCount.set(tag.name, { name: tag.name, color: tag.color, count: 1 }) }
      }
      cardData.favoriteTags = Array.from(tagCount.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // 4. 偏好制作组（基于全部收藏）
      const studios = await prisma.gameStudio.findMany({
        where: { gameId: { in: ids } },
        select: { studio: { select: { displayName: true } } },
      })
      const studioCount = new Map<string, number>()
      for (const { studio } of studios) {
        studioCount.set(studio.displayName, (studioCount.get(studio.displayName) ?? 0) + 1)
      }
      cardData.favoriteStudios = Array.from(studioCount.entries())
        .map(([displayName, count]) => ({ displayName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)

      // 5. 发售年份 + 平台分布（基于全部收藏）
      const favMeta = await prisma.favorite.findMany({
        where: { userId: user.id },
        select: { game: { select: { releaseDate: true, platforms: true } } },
      })
      const yearCount = new Map<number, number>()
      for (const f of favMeta) {
        if (!f.game.releaseDate) continue
        const y = f.game.releaseDate.getFullYear()
        if (y > 1970 && y <= new Date().getFullYear() + 1) {
          yearCount.set(y, (yearCount.get(y) ?? 0) + 1)
        }
      }
      cardData.favoriteYears = Array.from(yearCount.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year)

      const platformCount = new Map<string, number>()
      for (const f of favMeta) {
        const plats = Array.isArray(f.game.platforms) ? f.game.platforms as string[] : []
        for (const p of plats) platformCount.set(p, (platformCount.get(p) ?? 0) + 1)
      }
      cardData.favoritePlatforms = Array.from(platformCount.entries())
        .map(([platform, count]) => ({ platform, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
    }
  } catch (error) { logger.db.error("[UserProfilePage] Card data query failed", error) }

  // 签到热力条：最近 30 个自然日（今天-29d … 今天），无签到补 0
  try {
    const checkins = await prisma.checkIn.findMany({
      where: { userId: user.id },
      select: { date: true, marks: true },
    })
    const byDate = new Map<string, number>()
    for (const c of checkins) {
      const d = c.date instanceof Date ? c.date.toISOString().slice(0, 10) : String(c.date)
      byDate.set(d, c.marks)
    }
    const today = new Date()
    const heat: number[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400_000)
      const key = d.toISOString().slice(0, 10)
      heat.push(byDate.get(key) ?? 0)
    }
    cardData.checkinHeat = heat

    // 印记：总签到 marks - 已消费
    const { _sum } = await prisma.checkIn.aggregate({ where: { userId: user.id }, _sum: { marks: true } })
    cardData.marksTotal = (_sum.marks ?? 0) - (user.marksSpent ?? 0)
  } catch (error) { logger.db.error("[UserProfilePage] Card checkin query failed", error) }

  // 收藏夹索引：最多 3 个，每夹取 1-3 张封面拼贴
  try {
    const collections = await prisma.collection.findMany({
      where: { userId: user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true, name: true, description: true,
        favorites: {
          take: 3,
          orderBy: { createdAt: "desc" },
          select: { game: { select: { coverImage: true } } },
        },
        _count: { select: { favorites: true } },
      },
    })
    cardData.collections = collections.map((c) => ({
      id: c.id, name: c.name, description: c.description,
      covers: c.favorites.map((f) => f.game.coverImage),
      count: c._count.favorites,
    }))
  } catch (error) { logger.db.error("[UserProfilePage] Card collections query failed", error) }

  // 成就墙：最多 6 个已解锁成就
  try {
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: user.id },
      orderBy: { unlockedAt: "desc" },
      take: 6,
      select: {
        achievement: { select: { id: true, name: true, icon: true, category: true, hidden: true } },
      },
    })
    cardData.achievements = achievements
      .filter((a) => !a.achievement.hidden)
      .map((a) => ({
        id: a.achievement.id,
        name: a.achievement.name,
        icon: a.achievement.icon,
        category: a.achievement.category,
      }))
  } catch (error) { logger.db.error("[UserProfilePage] Card achievements query failed", error) }

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
      <BreadcrumbSetter segment={id} label={user.username} />
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
                  {ROLE_META[user.role as UserRole] && (
                    <span className={`rounded-full px-2.5 py-1 text-sm font-medium ring-1 ${ROLE_META[user.role as UserRole].className}`}>
                      {ROLE_META[user.role as UserRole].label}
                    </span>
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
                </div>
                {!isSelf && session?.user && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
                    <StartConversationButton targetUserId={user.id} username={user.username} />
                  </div>
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
                        avatarFrameUrl: user.avatarFrame?.imageUrl ?? "",
                        favoriteGames: cardData.favoriteGames,
                        favoriteTotal: cardData.favoriteTotal,
                        favoriteTags: cardData.favoriteTags,
                        favoriteStudios: cardData.favoriteStudios,
                        favoriteYears: cardData.favoriteYears,
                        favoritePlatforms: cardData.favoritePlatforms,
                        checkinHeat: cardData.checkinHeat,
                        marksTotal: cardData.marksTotal,
                        collections: cardData.collections,
                        achievements: cardData.achievements,
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