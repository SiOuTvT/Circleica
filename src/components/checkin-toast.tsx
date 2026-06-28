"use client"

import { X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface CheckInToastProps {
  marks: number
  imageUrl?: string
  onClose: () => void
}

interface CheckInConfig {
  title: string
  subtitle: string
  imageUrl: string
}

const DEFAULT_CONFIG: CheckInConfig = {
  title: "签到成功",
  subtitle: "获得 {marks} 印记",
  imageUrl: "",
}

export function CheckInToast({ marks, imageUrl: propImageUrl, onClose }: CheckInToastProps) {
  const [visible, setVisible] = useState(false)
  const [config, setConfig] = useState<CheckInConfig>(DEFAULT_CONFIG)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  // 获取签到配置
  useEffect(() => {
    fetch("/api/admin/checkin-config")
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => setConfig(DEFAULT_CONFIG))
  }, [])

  useEffect(() => {
    // 进入动画：下一帧显示
    const id = requestAnimationFrame(() => setVisible(true))

    // 4 秒后淡出（如果用户没有 hover）
    const startTimer = () => {
      timerRef.current = setTimeout(() => {
        setVisible(false)
        setTimeout(onClose, 300)
      }, 4000)
    }
    startTimer()

    return () => {
      cancelAnimationFrame(id)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onClose])

  // 鼠标悬停时暂停计时，离开后重新开始
  const handleMouseEnter = () => {
    setIsHovered(true)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 2000)
  }

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
    setTimeout(onClose, 300)
  }

  // 使用配置的 imageUrl，如果没有则使用 props 传入的
  const displayImageUrl = config.imageUrl || propImageUrl

  // 替换 subtitle 中的 {marks} 占位符
  const displaySubtitle = (config.subtitle || "获得 {marks} 印记").replace("{marks}", String(marks))

  return createPortal(
    <div
      role="alert"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        fixed left-1/2 z-[9999]
        bottom-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))]
        sm:bottom-8
        flex items-center gap-4 sm:gap-5
        rounded-2xl bg-card px-5 py-4 sm:px-7 sm:py-5
        ring-1 ring-border
        shadow-2xl
        backdrop-blur-sm
        transition-all duration-300 ease-out
        w-[calc(100vw-2rem)] sm:w-auto
        ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"}
      `}
      style={{
        transform: visible ? "translate(-50%, 0) scale(1)" : "translate(-50%, 1rem) scale(0.95)",
        maxWidth: "420px",
      }}
    >
      {/* 图片区 */}
      {displayImageUrl ? (
        <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border">
          <Image src={displayImageUrl} alt="" width={56} height={56} className="h-full w-full object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0" />
      )}

      {/* 文案区 */}
      <div className="min-w-0 flex-1">
        <p className="text-base sm:text-lg font-bold text-foreground">{config.title || "签到成功"}</p>
        <p className="text-sm sm:text-base text-muted-foreground mt-0.5">{displaySubtitle}</p>
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        aria-label="关闭通知"
        className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>,
    document.body
  )
}