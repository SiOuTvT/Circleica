"use client"

import { cn } from "@/lib/utils"
import { Award, Loader2, Lock, X } from "lucide-react"
import Image from "next/image"
import { Tag } from "@/components/ui/tag"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { api } from "@/lib/api-client"

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  characterImage: string
  category: string
  points: number
  unlocked: boolean
  unlockedAt: string | null
}

interface Props {
  compact?: boolean
  emptyText?: string
  lockedText?: string
}

export function AchievementModal({ compact, emptyText: _emptyText = "暂无成就，继续探索吧~", lockedText = "???" }: Props) {
  const [open, setOpen] = useState(false)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Achievement | null>(null)

  useEffect(() => {
    if (!open || achievements.length > 0) return
    setLoading(true)
    api.get("/api/achievements")
      .then((data) => { if (Array.isArray(data)) setAchievements(data as Achievement[]) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, achievements.length])

  const unlocked = achievements.filter((a) => a.unlocked)
  const locked = achievements.filter((a) => !a.unlocked)

  return (
    <>
      {/* 触发按钮 */}
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary"
        >
          <Award className="h-5 w-5 text-amber-400" strokeWidth={2} />
          <span className="text-xs font-medium text-foreground">成就</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-secondary"
        >
          <div className="flex items-center gap-2.5">
            <Award className="h-4 w-4 text-amber-400" strokeWidth={2} />
            成就
          </div>
        </button>
      )}

      {/* 弹窗 */}
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => { setOpen(false); setSelected(null) }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg max-h-[80vh] overflow-auto rounded-2xl bg-card ring-1 ring-border animate-in fade-in zoom-in-95 duration-200"
            style={{ boxShadow: "var(--shadow-3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Award className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-semibold text-foreground">成就</h2>
                <Tag color="#f59e0b">
                  {unlocked.length}
                </Tag>
              </div>
              <button
                onClick={() => { setOpen(false); setSelected(null) }}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                </div>
              ) : achievements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Award className="h-12 w-12 text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">暂无成就</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {/* 已解锁 */}
                  {unlocked.map((ach) => (
                    <button
                      key={ach.id}
                      onClick={() => setSelected(ach)}
                      className={cn(
                        "group flex flex-col items-center gap-2 rounded-2xl p-3 ring-1 transition-all",
                        "bg-amber-500/5 ring-amber-500/15 hover:-translate-y-0.5 hover:ring-amber-500/30"
                      )}
                    >
                      {ach.icon ? (
                        <Image src={ach.icon} alt="" width={40} height={40} className="h-10 w-10" unoptimized />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                          <Award className="h-5 w-5 text-amber-400" strokeWidth={2} />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-xs font-semibold leading-tight text-foreground">{ach.name}</p>
                        <p className="mt-0.5 text-micro text-muted-foreground leading-tight line-clamp-2">{ach.description}</p>
                      </div>
                    </button>
                  ))}

                  {/* 未解锁（隐藏） */}
                  {locked.map((ach) => (
                    <div
                      key={ach.id}
                      className="flex flex-col items-center gap-2 rounded-2xl p-3 ring-1 bg-muted/20 ring-border/30 opacity-40"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/40">
                        <Lock className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold leading-tight text-muted-foreground">{lockedText}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 解锁动画卡片 */}
          {selected && (
            <AchievementUnlockCard
              achievement={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </div>,
        document.body
      )}
    </>
  )
}

/**
 * 成就解锁动画卡片 — 横向布局，左侧立绘右侧内容
 */
function AchievementUnlockCard({ achievement, onClose }: { achievement: Achievement; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      className={cn(
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]",
        "w-[340px] h-[100px] overflow-visible rounded-xl",
        "bg-card backdrop-blur-xl ring-1 ring-amber-500/25",
        "shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(245,158,11,0.1)]",
        "transition-all duration-300 ease-out",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
      )}
    >
      {/* 顶部金线 */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

      {/* 关闭 */}
      <button
        onClick={onClose}
        className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>

      {/* 左侧立绘 */}
      {achievement.characterImage && (
        <div className="absolute -bottom-1 -left-2 h-[108px] w-[85px] pointer-events-none">
          <Image
            src={achievement.characterImage}
            alt=""
            width={85}
            height={108}
            className="h-full w-full object-contain object-bottom drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
            unoptimized
          />
        </div>
      )}

      {/* 右侧内容 */}
      <div className={cn(
        "flex flex-col justify-center h-full",
        achievement.characterImage ? "pl-[76px] pr-4" : "px-5"
      )}>
        <div className="flex items-center gap-1.5">
          {achievement.icon ? (
            <Image src={achievement.icon} alt="" width={16} height={16} className="h-4 w-4 shrink-0" unoptimized />
          ) : (
            <Award className="h-4 w-4 shrink-0 text-amber-400" strokeWidth={2} />
          )}
          <span className="text-sm font-bold text-amber-400 tracking-tight leading-none truncate">
            {achievement.name}
          </span>
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p className="text-xs text-muted-foreground leading-tight line-clamp-2 flex-1">
            {achievement.description}
          </p>
          <Tag variant="badge" color="#f59e0b" className="tabular-nums">
            +{achievement.points}
          </Tag>
        </div>
      </div>
    </div>
  )
}
