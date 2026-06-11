"use client"

import { X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

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

  return (
    <div
      role="alert"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        fixed left-1/2 top-[70%] z-[9999]
        flex items-center gap-5
        rounded-[1.75rem] bg-card px-7 py-5
        ring-1 ring-border
        shadow-2xl
        transition-all duration-300 ease-out
        ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"}
      `}
      style={{
        transform: visible ? "translate(-50%, 0) scale(1)" : "translate(-50%, 1rem) scale(0.95)",
        minWidth: "350px",
        maxWidth: "450px",
      }}
    >
      {/* 图片区：56×56px，有图时显示，无图时隐藏 */}
      {displayImageUrl ? (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border">
          <Image src={displayImageUrl} alt="" width={56} height={56} className="h-full w-full object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-14 w-14 shrink-0" />
      )}

      {/* 文案区 */}
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-foreground">{config.title || "签到成功"}</p>
        <p className="text-base text-muted-foreground mt-0.5">{displaySubtitle}</p>
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        aria-label="关闭通知"
        className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-6 w-6" strokeWidth={2} />
      </button>
    </div>
  )
}