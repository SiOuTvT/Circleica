import { AvatarFrame } from "@/components/avatar-frame"
import { AvatarFrameSelector } from "@/components/avatar-frame-selector"
import { ProfileGameTabs } from "@/components/profile-game-tabs"
import { ProfileMedals } from "@/components/profile-medals"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getRandomAvatarColor } from "@/lib/utils"
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
    },
  })

  if (!user) notFound()

  const userRank = await prisma.user.count({ where: { createdAt: { lte: user.createdAt } } })
  // Filter out private favorites
  const favGames = user.favorites.map((f) => f.game)
  const allFavGames = user.favorites.map(f => f.game)
  const { lv, label } = calcLevel(allFavGames.length, user.playStatuses.length, user.comments.length)
  const playStatusGames = user.playStatuses.map(p => ({ game: p.game, status: p.status }))
  const isSelf = session?.user?.id === id

  const faveGame = user.faveGameId
    ? await prisma.game.findUnique({ where: { id: user.faveGameId }, select: { id: true, title: true, coverImage: true, originalWork: true } })
    : null

  const statItems = [
    { icon: Heart,        value: allFavGames.length,          label: "收藏" },
    { icon: MessageSquare, value: user.comments.length,       label: "评论" },
    { icon: Gamepad2,     value: user.playStatuses.length,    label: "玩过" },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* 4:6 双栏布局 */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ====== 左侧名片区 40% ====== */}
        <aside className="w-full lg:w-[40%] lg:shrink-0">
          <div className="rounded-3xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)' }}>

            {/* Banner */}
            {user.banner && (
              <div className="h-28 w-full bg-cover bg-center sm:h-36" style={{ backgroundImage: `url(${user.banner})` }} />
            )}

            <div className="p-6 flex flex-col items-center text-center">

              {/* 圆形头像 - 居中，尺寸适中 */}
              <div className={user.banner ? "-mt-16 mb-4" : "mb-4"}>
                <AvatarFrame frameId={(user as any).avatarFrame || "none"} size={100}>
                  {user.avatar ? (
                    <img
                      src={`${user.avatar}${user.avatar.includes('?') ? '&' : '?'}t=${Date.now()}`}
                      alt={user.username}
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-full text-4xl font-bold text-white"
                      style={{ backgroundColor: getRandomAvatarColor(user.username) }}
                    >
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                </AvatarFrame>
              </div>

              {/* 用户名 */}
              <h1 className="text-xl font-bold text-foreground tracking-tight">{user.username}</h1>

              {/* 等级 */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 text-violet-400" strokeWidth={2} />
                <span>LV.{lv} · {label}</span>
              </div>

              {/* 简介 */}
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {user.bio || "这个人很懒，什么都没留下。"}
              </p>

              {/* 横向数据栏 */}
              <div className="mt-5 flex items-center justify-center gap-6 sm:gap-8">
                {statItems.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                      <span className="text-lg font-bold text-foreground">{value}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>

              {/* 元信息 */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" strokeWidth={1.5} />
                  第 {userRank} 位成员
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" strokeWidth={1.5} />
                  {new Date(user.createdAt).toLocaleDateString("zh-CN")} 加入
                </span>
              </div>

              {/* 功能按钮 */}
              {isSelf && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
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
          </div>
        </aside>

        {/* ====== 右侧内容区 60% ====== */}
        <main className="w-full lg:w-[60%] space-y-6">

          {/* 勋章系统 - 仅展示已获得 */}
          <div className="rounded-3xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)' }}>
            <ProfileMedals
              favCount={allFavGames.length}
              playCount={user.playStatuses.length}
              commentCount={user.comments.length}
              totalLevel={lv}
            />
          </div>

          {/* 游戏收藏 / 足迹 */}
          <div className="rounded-3xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)' }}>
            <ProfileGameTabs
              faveGame={faveGame ?? null}
              favGames={favGames}
              playStatusGames={playStatusGames}
            />
          </div>

          {/* 个人动态 - Workflow 足迹流 */}
          <section className="rounded-3xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)' }}>
            <div className="p-5 sm:p-6">
              <h2 className="mb-5 flex items-center gap-3 text-base font-semibold text-foreground">
                <span className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-purple-400" />
                个人动态
              </h2>
              {user.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">暂无动态记录</p>
              ) : (
                <div className="relative space-y-0 pl-8">
                  <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />
                  {user.comments.slice(0, 15).map((c) => (
                    <div key={c.id} className="relative pb-6 last:pb-0">
                      <div className="absolute -left-6 top-1.5 h-5 w-5 rounded-full border-2 border-primary/40 bg-card flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-primary/60" />
                      </div>
                      <div className="rounded-2xl bg-secondary/50 p-4 ring-1 ring-border">
                        <p className="text-[11px] text-muted-foreground mb-1.5">
                          {new Date(c.createdAt).toLocaleDateString("zh-CN")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          评论了{" "}
                          <Link href={`/games/${c.game.id}`} className="text-primary hover:text-primary/80 transition-colors font-medium">
                            《{c.game.title}》
                          </Link>
                        </p>
                        <p className="mt-1.5 line-clamp-2 text-sm text-foreground/80 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}