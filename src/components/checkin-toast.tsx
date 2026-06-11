"use client"

import { X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

interface CheckInToastProps {
  marks: number
  imageUrl?: string
  onClose: () => void
}

export function CheckInToast({ marks, imageUrl, onClose }: CheckInToastProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 进入动画：下一帧显示
    const id = requestAnimationFrame(() => setVisible(true))

    // 3 秒后淡出
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300) // 等淡出动画完成
    }, 2000)

    return () => {
      cancelAnimationFrame(id)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onClose])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed left-1/2 top-[75%] z-[9999]
        flex items-center gap-4
        rounded-3xl bg-card px-6 py-5
        ring-1 ring-border
        shadow-2xl
        transition-all duration-300 ease-out
        ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"}
      `}
      style={{
        transform: visible ? "translate(-50%, 0) scale(1)" : "translate(-50%, 1rem) scale(0.95)",
        minWidth: "320px",
        maxWidth: "450px",
      }}
    >
      {/* 图片区：48×48px，有图时显示，无图时隐藏 */}
      {imageUrl ? (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/50">
          <Image src={imageUrl} alt="" width={48} height={48} className="h-full w-full object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0" />
      )}

      {/* 文案区 */}
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-foreground">签到成功</p>
        <p className="text-sm text-muted-foreground">获得 {marks} 印记</p>
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        aria-label="关闭通知"
        className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  )
}