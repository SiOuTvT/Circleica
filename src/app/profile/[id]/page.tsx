import { ProfileGameTabs } from "@/components/profile-game-tabs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cn, getRandomAvatarColor } from "@/lib/utils"
import { Calendar, Gamepad2, Heart, KeyRound, Lock, MessageSquare, Pencil, Star, TrendingUp, User as UserIcon } from "lucide-react"
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
    <div>
      {/* 顶部用户信息卡片 - 横向大卡片 */}
      <div className="rounded-3xl bg-card ring-1 ring-border overflow-hidden mb-8"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)' }}>
        {/* Banner */}
        {user.banner && (
          <div 
            className="h-40 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${user.banner})` }}
          />
        )}
        
        {/* 主体内容 - 横向布局 */}
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* 左侧：头像 + 基本信息 */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1 min-w-0">
              {/* 头像 */}
              <div className="shrink-0">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="h-32 w-32 lg:h-36 lg:w-36 rounded-2xl object-cover ring-2 ring-border shadow-lg" />
                ) : (
                  <div 
                    className="flex h-32 w-32 lg:h-36 lg:w-36 items-center justify-center rounded-2xl text-5xl font-bold text-white ring-2 ring-border shadow-lg"
                    style={{ backgroundColor: getRandomAvatarColor(user.username) }}
                  >
                    <UserIcon className="h-20 w-20" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              
              {/* 用户信息 */}
              <div className="text-center sm:text-left min-w-0">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">{user.username}</h1>
                <p className="mt-2 text-base lg:text-lg text-muted-foreground leading-relaxed">{user.bio || "这个人很懒，什么都没留下。"}</p>
                
                {/* 等级徽章 */}
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500/15 to-purple-500/10 px-4 py-1.5 text-sm font-semibold text-violet-400 ring-1 ring-violet-500/20">
                  <Star className="h-4 w-4" strokeWidth={2} />
                  LV.{lv} · {label}
                </div>
                
                {/* 加入信息 */}
                <div className="mt-3 flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center justify-center sm:justify-start gap-1.5">
                    <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
                    第 {userRank} 位成员
                  </span>
                  <span className="flex items-center justify-center sm:justify-start gap-1.5">
                    <Calendar className="h-4 w-4" strokeWidth={1.5} />
                    {new Date(user.createdAt).toLocaleDateString("zh-CN")} 加入
                  </span>
                </div>

                {/* 功能按钮 */}
                {isSelf && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href="/profile/edit" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md">
                      <Pencil className="h-4 w-4" strokeWidth={2} />编辑资料
                    </Link>
                    <Link href="/profile/edit#password" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md">
                      <KeyRound className="h-4 w-4" strokeWidth={2} />修改密码
                    </Link>
                    <Link href="/forgot-password" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md">
                      <Lock className="h-4 w-4" strokeWidth={2} />忘记密码
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧：数据统计 - 4个大方块 */}
            <div className="grid grid-cols-2 gap-4 w-full lg:w-auto lg:min-w-[280px] shrink-0">
              {stats.map(({ icon: Icon, value, label, color, iconColor, accent }) => (
                <div key={label} className={cn(
                  "rounded-2xl p-5 text-center ring-1 ring-border transition-all hover:shadow-lg hover:scale-[1.02]",
                  accent ? "bg-gradient-to-br from-violet-500/15 to-purple-500/10 ring-violet-500/20" : "bg-card"
                )}
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                >
                  <div className={cn("mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br", color)}>
                    <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={2} />
                  </div>
                  <div className={cn("text-2xl font-bold tracking-tight", accent ? "text-violet-400" : "text-foreground")}>{value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 下方内容区 */}
      <div className="space-y-8">
        {/* 游戏 tab */}
        <ProfileGameTabs
          faveGame={faveGame ?? null}
          favGames={favGames}
          playStatusGames={playStatusGames}
        />

        {/* 个人动态 */}
        <section>
          <h2 className="mb-5 flex items-center gap-3 text-xl font-semibold text-foreground">
            <span className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-purple-400" />
            个人动态
          </h2>
          {user.comments.length === 0 ? (
            <p className="text-base text-muted-foreground py-12 text-center">暂无动态记录</p>
          ) : (
            <div className="relative space-y-0 pl-8">
              <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />
              {user.comments.map((c) => (
                <div key={c.id} className="relative pb-6">
                  <div className="absolute -left-6 top-1.5 h-5 w-5 rounded-full border-2 border-border bg-card" />
                  <p className="text-sm text-muted-foreground mb-1.5">{new Date(c.createdAt).toLocaleDateString("zh-CN")}</p>
                  <p className="text-base text-muted-foreground">
                    评论了{" "}
                    <Link href={`/games/${c.game.id}`} className="text-primary hover:text-primary/80 transition-colors font-medium">
                      《{c.game.title}》
                    </Link>
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-base text-muted-foreground leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}