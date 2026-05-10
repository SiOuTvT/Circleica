import { AvatarFrame } from "@/components/avatar-frame"
import { AvatarFrameSelector } from "@/components/avatar-frame-selector"
import { ProfileGameTabs } from "@/components/profile-game-tabs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cn, getRandomAvatarColor } from "@/lib/utils"
import { Calendar, Gamepad2, Heart, KeyRound, MessageSquare, Pencil, Star, TrendingUp } from "lucide-react"
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
        take: 24,
      },
      playStatuses: {
        include: {
          game: { select: { id: true, title: true, coverImage: true, isNsfw: true } },
        },
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { game: { select: { id: true, title: true } } },
      },
    },
  })

  if (!user) notFound()

  const userRank = await prisma.user.count({ where: { createdAt: { lte: user.createdAt } } })
  const favGames = user.favorites.map((f) => f.game)
  const { lv, label } = calcLevel(favGames.length, user.playStatuses.length, user.comments.length)
  const playStatusGames = user.playStatuses.map(p => ({ game: p.game, status: p.status }))
  const isSelf = session?.user?.id === id

  const faveGame = user.faveGameId
    ? await prisma.game.findUnique({ where: { id: user.faveGameId }, select: { id: true, title: true, coverImage: true, originalWork: true } })
    : null

  const stats = [
    { icon: Heart,        value: favGames.length,          label: "收藏", color: "from-rose-500/20 to-pink-500/10", iconColor: "text-rose-400" },
    { icon: Gamepad2,     value: user.playStatuses.length, label: "玩过", color: "from-sky-500/20 to-blue-500/10", iconColor: "text-sky-400" },
    { icon: MessageSquare,value: user.comments.length,     label: "评论", color: "from-amber-500/20 to-yellow-500/10", iconColor: "text-amber-400" },
    { icon: Star,         value: `LV.${lv}`,               label, color: "from-violet-500/20 to-purple-500/10", iconColor: "text-violet-400", accent: true },
  ]

  return (
    <div className="flex flex-col gap-5">

      {/* 顶部用户信息栏 - 横向布局 */}
      <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)' }}>
        
        {/* Banner */}
        {user.banner && (
          <div className="h-28 w-full bg-cover bg-center sm:h-36" style={{ backgroundImage: `url(${user.banner})` }} />
        )}

        <div className="p-4 sm:p-6">
          {/* 头像 + 信息 + 按钮 横向布局 */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* 头像（带头像框） */}
            <div className={cn(
              "flex shrink-0 justify-center sm:justify-start",
              user.banner ? "-mt-16 sm:-mt-12" : ""
            )}>
              <AvatarFrame frameId={(user as any).avatarFrame || "none"} size={96}>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="h-full w-full object-cover rounded-full" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full text-3xl sm:text-4xl font-bold text-white"
                    style={{ backgroundColor: getRandomAvatarColor(user.username) }}
                  >
                    {user.username[0].toUpperCase()}
                  </div>
                )}
              </AvatarFrame>
            </div>

            {/* 用户信息 */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{user.username}</h1>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">{user.bio || "这个人很懒，什么都没留下。"}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-violet-400" strokeWidth={2} />
                  LV.{lv} · {label}
                </span>
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                  第 {userRank} 位成员
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {new Date(user.createdAt).toLocaleDateString("zh-CN")} 加入
                </span>
              </div>
            </div>

            {/* 功能按钮 */}
            {isSelf && (
              <div className="flex shrink-0 flex-wrap justify-center sm:justify-end gap-2">
                <Link href="/profile/edit" className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />编辑资料
                </Link>
                <Link href="/profile/edit#password" className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground">
                  <KeyRound className="h-3.5 w-3.5" strokeWidth={2} />修改密码
                </Link>
                <AvatarFrameSelector
                  currentFrame={(user as any).avatarFrame || "none"}
                  userImage={user.avatar}
                  userName={user.username}
                />
              </div>
            )}
          </div>

          {/* 统计数据 - 横向排列在头像信息下方 */}
          <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
            {stats.map(({ icon: Icon, value, label, color, iconColor, accent }) => (
              <div key={label} className={cn(
                "rounded-xl p-3 sm:p-4 text-center ring-1 ring-border transition-all hover:shadow-md",
                accent ? "bg-gradient-to-br from-violet-500/15 to-purple-500/10 ring-violet-500/20" : "bg-secondary/50"
              )}>
                <div className={cn("mx-auto mb-1 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br", color)}>
                  <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", iconColor)} strokeWidth={2} />
                </div>
                <div className={cn("text-base sm:text-lg font-bold tracking-tight", accent ? "text-violet-400" : "text-foreground")}>{value}</div>
                <div className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 下方内容区 */}
      <div className="space-y-5">
        {/* 游戏 tab */}
        <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <ProfileGameTabs
            faveGame={faveGame ?? null}
            favGames={favGames}
            playStatusGames={playStatusGames}
          />
        </div>

        {/* 个人动态 */}
        <section className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="p-5 sm:p-6">
            <h2 className="mb-5 flex items-center gap-3 text-lg font-semibold text-foreground">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-purple-400" />
              个人动态
            </h2>
            {user.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">暂无动态记录</p>
            ) : (
              <div className="relative space-y-0 pl-8">
                <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />
                {user.comments.map((c) => (
                  <div key={c.id} className="relative pb-6">
                    <div className="absolute -left-6 top-1.5 h-5 w-5 rounded-full border-2 border-border bg-card" />
                    <p className="text-xs text-muted-foreground mb-1.5">{new Date(c.createdAt).toLocaleDateString("zh-CN")}</p>
                    <p className="text-sm text-muted-foreground">
                      评论了{" "}
                      <Link href={`/games/${c.game.id}`} className="text-primary hover:text-primary/80 transition-colors font-medium">
                        《{c.game.title}》
                      </Link>
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}