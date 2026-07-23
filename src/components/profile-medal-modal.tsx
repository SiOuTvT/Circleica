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
    X,
    Zap,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Tag } from "@/components/ui/tag"
import { Badge } from "@/components/ui/badge"

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
  compact?: boolean
}

export function ProfileMedalModal({ favCount, playCount, commentCount, totalLevel, compact }: Props) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const node = dialogRef.current
    node?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return }
      if (e.key === "Tab" && node) {
        const focusables = node.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("keydown", onKey); prev?.focus() }
  }, [open])

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
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "ring-primary/20",
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
    <>
      {/* 触发按钮 */}
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary"
        >
          <Award className="h-5 w-5 text-amber-400" strokeWidth={2} />
          <span className="text-xs font-medium text-foreground">勋章墙</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary"
        >
          <div className="flex items-center gap-2.5">
            <Award className="h-4 w-4 text-amber-400" strokeWidth={2} />
            勋章墙
          </div>
          <Badge variant="warning" size="sm">
            {earnedMedals.length}
          </Badge>
        </button>
      )}

      {/* 弹窗 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setOpen(false)}>
          {/* 遮罩 */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          {/* 内容 */}
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="medal-modal-title"
            tabIndex={-1}
            className="relative w-full max-w-lg max-h-[80vh] overflow-auto rounded-2xl bg-card ring-1 ring-border animate-in fade-in zoom-in-95 duration-200"
            style={{ boxShadow: 'var(--shadow-3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Award className="h-5 w-5 text-amber-400" />
                <h2 id="medal-modal-title" className="text-base font-semibold text-foreground">勋章墙</h2>
                <Tag color="#f59e0b">
                  {earnedMedals.length}
                </Tag>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 勋章网格 */}
            <div className="p-5">
              {earnedMedals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Award className="h-12 w-12 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">暂无勋章，继续努力吧~</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
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
                          <p className={cn("text-xs font-semibold leading-tight", medal.earned ? "text-foreground" : "text-muted-foreground")}>
                            {medal.name}
                          </p>
                          <p className="mt-0.5 text-micro text-muted-foreground leading-tight line-clamp-2">
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
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
                >
                  <Award className="h-3.5 w-3.5" strokeWidth={2} />
                  {showAll ? "仅显示已获得" : "查看全部"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}