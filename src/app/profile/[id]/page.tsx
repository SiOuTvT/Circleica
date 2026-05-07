import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Calendar, Star, Heart, MessageSquare, Gamepad2, Pencil, KeyRound, Lock, User as UserIcon } from "lucide-react"
import { ProfileGameTabs } from "@/components/profile-game-tabs"
import { cn, getRandomAvatarColor } from "@/lib/utils"

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
    { icon: Heart,        value: favGames.length,          label: "收藏" },
    { icon: Gamepad2,     value: user.playStatuses.length, label: "玩过" },
    { icon: MessageSquare,value: user.comments.length,     label: "评论" },
    { icon: Star,         value: `LV.${lv}`,               label, accent: true },
  ]

  return (
    <div>
      {/* 电脑端：左右布局；手机端：上下布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        
        {/* 左侧用户信息卡片（电脑端）/ 上方（手机端）*/}
        <aside className="space-y-4">
          {/* 用户卡片 */}
          <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
            {/* Banner */}
            {user.banner && (
              <div 
                className="h-24 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${user.banner})` }}
              />
            )}
            
            {/* 头像和信息 */}
            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                {/* 大头像 */}
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="h-28 w-28 rounded-full object-cover ring-2 ring-border mb-4" />
                ) : (
                  <div 
                    className="flex h-28 w-28 items-center justify-center rounded-full text-4xl font-bold text-white ring-2 ring-border mb-4"
                    style={{ backgroundColor: getRandomAvatarColor(user.username) }}
                  >
                    <UserIcon className="h-16 w-16" strokeWidth={1.5} />
                  </div>
                )}
                
                {/* 用户名 */}
                <h1 className="text-xl font-bold text-foreground">{user.username}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{user.bio || "这个人很懒，什么都没留下。"}</p>
                
                {/* 等级徽章 */}
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  <Star className="h-3.5 w-3.5" strokeWidth={1.5} />
                  LV.{lv} · {label}
                </div>
                
                {/* 加入信息 */}
                <div className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center justify-center gap-1">
                    <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                    第 {userRank} 位成员
                  </span>
                  <span className="flex items-center justify-center gap-1">
                    <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {new Date(user.createdAt).toLocaleDateString("zh-CN")} 加入
                  </span>
                </div>
              </div>
              
              {/* 功能按钮 */}
              {isSelf && (
                <div className="mt-5 space-y-2">
                  <Link href="/profile/edit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground">
                    <Pencil className="h-4 w-4" strokeWidth={2} />编辑资料
                  </Link>
                  <Link href="/profile/edit#password" className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground">
                    <KeyRound className="h-4 w-4" strokeWidth={2} />修改密码
                  </Link>
                  <Link href="/forgot-password" className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground">
                    <Lock className="h-4 w-4" strokeWidth={2} />忘记密码
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* 数据统计卡片 */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ icon: Icon, value, label, accent }) => (
              <div key={label} className="rounded-xl bg-card p-4 ring-1 ring-border text-center">
                <Icon className={cn("h-5 w-5 mx-auto mb-1", accent ? "text-primary" : "text-muted-foreground")} strokeWidth={1.5} />
                <div className={cn("text-lg font-bold", accent ? "text-primary" : "text-foreground")}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* 右侧内容区 */}
        <main className="space-y-6">
          {/* 游戏 tab */}
          <ProfileGameTabs
            faveGame={faveGame ?? null}
            favGames={favGames}
            playStatusGames={playStatusGames}
          />

          {/* 个人动态 */}
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-purple-400" />
              个人动态
            </h2>
            {user.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">暂无动态记录</p>
            ) : (
              <div className="relative space-y-0 pl-6">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                {user.comments.map((c) => (
                  <div key={c.id} className="relative pb-5">
                    <div className="absolute -left-5 top-1.5 h-4 w-4 rounded-full border-2 border-border bg-card" />
                    <p className="text-xs text-muted-foreground mb-1">{new Date(c.createdAt).toLocaleDateString("zh-CN")}</p>
                    <p className="text-sm text-muted-foreground">
                      评论了{" "}
                      <Link href={`/games/${c.game.id}`} className="text-primary hover:text-primary/80 transition-colors font-medium">
                        《{c.game.title}》
                      </Link>
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
