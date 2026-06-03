"use client"

import { cn } from "@/lib/utils"
import { Award, X } from "lucide-react"
import { useEffect, useState } from "react"

export interface AchievementToastData {
  id: string
  name: string
  description: string
  icon?: string        // 成就图标 URL（可选， fallback 到 Award 图标）
  points: number
  characterImage?: string  // 透明底角色立绘 URL
}

interface Props {
  achievement: AchievementToastData
  onClose: () => void
}

/**
 * 成就解锁动画通知卡片
 *
 * 布局：横向长方形，左侧立绘微溢出，右侧内容
 * 尺寸：约 320×90px，紧凑不遮挡
 * 动画：从左滑入 + 淡入，4秒后自动消失
 */
export function AchievementToast({ achievement, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // 入场延迟（等 DOM 挂载后触发动画）
    requestAnimationFrame(() => setVisible(true))

    // 4秒后自动退出
    const timer = setTimeout(() => handleClose(), 4000)
    return () => clearTimeout(timer)
  }, [])

  function handleClose() {
    setExiting(true)
    setTimeout(onClose, 300) // 等退出动画结束
  }

  return (
    <div
      className={cn(
        "pointer-events-auto relative w-[320px] h-[90px] overflow-visible rounded-xl",
        "bg-zinc-900/95 backdrop-blur-xl ring-1 ring-amber-500/20",
        "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(245,158,11,0.08)]",
        "transition-all duration-200 ease-out",
        visible && !exiting
          ? "opacity-100 scale-100"
          : "opacity-0 scale-95"
      )}
    >
      {/* 顶部金色细线 */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-zinc-300 hover:bg-zinc-700/50"
      >
        <X className="h-3 w-3" strokeWidth={2.5} />
      </button>

      {/* 左侧：角色立绘 */}
      {achievement.characterImage && (
        <div className="absolute -bottom-1 -left-2 h-[100px] w-[80px] pointer-events-none">
          <img
            src={achievement.characterImage}
            alt=""
            className="h-full w-full object-contain object-bottom drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
          />
        </div>
      )}

      {/* 右侧：内容区 */}
      <div className={cn(
        "flex flex-col justify-center h-full",
        achievement.characterImage ? "pl-[72px] pr-3" : "px-4"
      )}>
        {/* 上行：成就图标 + 名称 */}
        <div className="flex items-center gap-1.5">
          {achievement.icon ? (
            <img src={achievement.icon} alt="" className="h-4 w-4 shrink-0" />
          ) : (
            <Award className="h-4 w-4 shrink-0 text-amber-400" strokeWidth={2.5} />
          )}
          <span className="text-[13px] font-bold text-amber-400 tracking-tight leading-none truncate">
            {achievement.name}
          </span>
        </div>

        {/* 下行：描述 + 积分 */}
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p className="text-[11px] text-zinc-400 leading-tight line-clamp-2 flex-1">
            {achievement.description}
          </p>
          <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 tabular-nums">
            +{achievement.points}
          </span>
        </div>
      </div>
    </div>
  )
}
