"use client"

import { cn } from "@/lib/utils"
import {
    Award,
    BookmarkPlus,
    Flame,
    Gamepad2,
    MessageCircle,
    Shield,
    Sparkles,
    Star,
    Sword,
    Trophy,
    Zap,
} from "lucide-react"
import { useState } from "react"

interface Medal {
  id: string
  icon: React.ElementType
  name: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  earned: boolean
}

interface Props {
  favCount: number
  playCount: number
  commentCount: number
  totalLevel: number
}

export function ProfileMedals({ favCount, playCount, commentCount, totalLevel }: Props) {
  const [showAll, setShowAll] = useState(false)

  const allMedals: Medal[] = [
    {
      id: "first-fav",
      icon: BookmarkPlus,
      name: "初次心动",
      description: "收藏第 1 个游戏",
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "ring-rose-500/20",
      earned: favCount >= 1,
    },
    {
      id: "collector",
      icon: Star,
      name: "收藏达人",
      description: "收藏 10 个游戏",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "ring-amber-500/20",
      earned: favCount >= 10,
    },
    {
      id: "hoarder",
      icon: Trophy,
      name: "仓库管理员",
      description: "收藏 30 个游戏",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "ring-yellow-500/20",
      earned: favCount >= 30,
    },
    {
      id: "first-play",
      icon: Gamepad2,
      name: "初入坑",
      description: "记录第 1 个游玩状态",
      color: "text-sky-400",
      bgColor: "bg-sky-500/10",
      borderColor: "ring-sky-500/20",
      earned: playCount >= 1,
    },
    {
      id: "player",
      icon: Sword,
      name: "老司机",
      description: "记录 10 个游玩状态",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "ring-blue-500/20",
      earned: playCount >= 10,
    },
    {
      id: "veteran",
      icon: Shield,
      name: "骨灰玩家",
      description: "记录 20 个游玩状态",
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      borderColor: "ring-indigo-500/20",
      earned: playCount >= 20,
    },
    {
      id: "first-comment",
      icon: MessageCircle,
      name: "初次发言",
      description: "发布第 1 条评论",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "ring-emerald-500/20",
      earned: commentCount >= 1,
    },
    {
      id: "commenter",
      icon: Flame,
      name: "话唠",
      description: "发布 10 条评论",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "ring-orange-500/20",
      earned: commentCount >= 10,
    },
    {
      id: "active",
      icon: Zap,
      name: "活跃达人",
      description: "等级达到 5",
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
      borderColor: "ring-violet-500/20",
      earned: totalLevel >= 5,
    },
    {
      id: "legend",
      icon: Sparkles,
      name: "传奇玩家",
      description: "等级达到 10",
      color: "text-fuchsia-400",
      bgColor: "bg-fuchsia-500/10",
      borderColor: "ring-fuchsia-500/20",
      earned: totalLevel >= 10,
    },
  ]

  const earnedMedals = allMedals.filter(m => m.earned)
  const displayed = showAll ? allMedals : earnedMedals

  return (
    <div className="p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 text-base font-semibold text-foreground">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
        勋章
        <span className="text-xs font-normal text-muted-foreground">({earnedMedals.length}/{allMedals.length})</span>
      </h2>

      {earnedMedals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">暂无勋章，继续努力吧~</p>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
          {displayed.map((medal) => {
            const Icon = medal.icon
            return (
              <div
                key={medal.id}
                className={cn(
                  "group flex flex-col items-center gap-2 rounded-2xl p-3 ring-1 transition-all cursor-default",
                  medal.earned
                    ? cn(medal.bgColor, medal.borderColor, "hover:-translate-y-0.5")
                    : "bg-muted/30 ring-border/50 opacity-40"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                  medal.earned ? medal.bgColor : "bg-muted/50"
                )}>
                  <Icon className={cn("h-5 w-5", medal.earned ? medal.color : "text-muted-foreground")} strokeWidth={2} />
                </div>
                <div className="text-center">
                  <p className={cn("text-[11px] font-semibold leading-tight", medal.earned ? "text-foreground" : "text-muted-foreground")}>
                    {medal.name}
                  </p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground leading-tight line-clamp-2">
                    {medal.earned ? medal.description : "未解锁"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {earnedMedals.length > 0 && earnedMedals.length < allMedals.length && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Award className="h-3.5 w-3.5" strokeWidth={2} />
          {showAll ? "仅显示已获得" : `查看全部 (${allMedals.length - earnedMedals.length} 个未解锁)`}
        </button>
      )}
    </div>
  )
}