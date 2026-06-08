"use client"

import Image from "next/image"
import { useId } from "react"

/**
 * 头像框组件
 * 支持两种模式：
 * 1. DB头像框：通过 frameImageUrl 传入头像框图片URL，叠加在头像上
 * 2. 内置头像框：如"slime"史莱姆主题
 *
 * 所有场景统一使用 composedAvatarUrl（服务端合成）进行最终展示，
 * 本组件仅在需要实时预览（如选择器）时使用 overlay 模式。
 */

interface AvatarFrameProps {
  frameId?: string | null
  frameImageUrl?: string | null  // DB头像框的图片URL
  size?: number                  // 头像本身的尺寸(px)，默认48
  className?: string
  children?: React.ReactNode
  /** 强制使用overlay模式（即使有composedAvatarUrl也叠加显示） */
  overlay?: boolean
}

export function AvatarFrame({
  frameId,
  frameImageUrl,
  size = 48,
  className = "",
  children,
  overlay: _overlay = false,
}: AvatarFrameProps) {
  // 没有头像框，直接渲染children
  if ((!frameId || frameId === "none") && !frameImageUrl) {
    return <>{children}</>
  }

  // 如果有DB头像框图片URL，使用通用图片叠加
  if (frameImageUrl) {
    return (
      <div
        className={`relative inline-block ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="h-full w-full overflow-hidden rounded-full">
          {children}
        </div>
        <Image
          src={frameImageUrl}
          alt="头像框"
          fill
          className="pointer-events-none object-contain"
          loading="eager"
          unoptimized
        />
      </div>
    )
  }

  // 内置史莱姆头像框
  if (frameId === "slime") {
    return <SlimeFrame size={size} className={className}>{children}</SlimeFrame>
  }

  // 未知frameId，直接渲染children
  return <>{children}</>
}

/** 史莱姆主题头像框 */
function SlimeFrame({ size, className = "", children }: { size: number; className?: string; children?: React.ReactNode }) {
  const id = useId()
  const containerSize = Math.round(size * 1.35)
  const slimeSize = Math.round(size * 0.55)

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: containerSize, height: containerSize }}
    >
      <div
        className="absolute overflow-hidden rounded-full"
        style={{
          width: size,
          height: size,
          left: (containerSize - size) / 2,
          top: (containerSize - size) / 2,
        }}
      >
        {children}
      </div>

      <svg
        className="pointer-events-none absolute"
        style={{ width: containerSize, height: containerSize, left: 0, top: 0 }}
        viewBox="0 0 100 100"
      >
        <defs>
          <linearGradient id={`${id}-slime-ring-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#7DD3FC" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
          </linearGradient>
          <filter id={`${id}-slime-ring-glow`}>
            <feGaussianBlur stdDeviation="1" />
          </filter>
        </defs>
        <circle cx="50" cy="53" r="38" fill="none" stroke={`url(#${id}-slime-ring-grad)`} strokeWidth="2" filter={`url(#${id}-slime-ring-glow)`} opacity="0.4" />
        <circle cx="50" cy="53" r="36" fill="none" stroke={`url(#${id}-slime-ring-grad)`} strokeWidth="1.8" />
        <circle cx="50" cy="53" r="34.5" fill="none" stroke="#7DD3FC" strokeWidth="0.4" opacity="0.4" />
      </svg>

      <SlimeOnCorner size={slimeSize} containerSize={containerSize} />
    </div>
  )
}

/** 可爱的蓝色史莱姆，趴在右上角 */
function SlimeOnCorner({ size, containerSize: _containerSize }: { size: number; containerSize: number }) {
  const id = useId()
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        width: size,
        height: size,
        right: -size * 0.15,
        top: -size * 0.25,
      }}
    >
      <svg viewBox="0 0 80 80" width={size} height={size}>
        <defs>
          <radialGradient id={`${id}-slime-body`} cx="45%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#7DD3FC" />
            <stop offset="40%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </radialGradient>
          <radialGradient id={`${id}-slime-highlight`} cx="35%" cy="25%" r="30%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-slime-shadow`} cx="50%" cy="80%" r="40%">
            <stop offset="0%" stopColor="#0369A1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0369A1" stopOpacity="0" />
          </radialGradient>
        </defs>

        <path
          d="M40 10 C55 10, 70 22, 70 40 C70 52, 65 60, 60 65 Q52 72, 40 72 Q28 72, 20 65 C15 60, 10 52, 10 40 C10 22, 25 10, 40 10Z"
          fill={`url(#${id}-slime-body)`}
          stroke="#0EA5E9"
          strokeWidth="0.8"
        >
          <animate
            attributeName="d"
            values="M40 10 C55 10,70 22,70 40 C70 52,65 60,60 65 Q52 72,40 72 Q28 72,20 65 C15 60,10 52,10 40 C10 22,25 10,40 10Z;
                    M40 11 C54 11,69 23,69 41 C69 53,64 60,59 65 Q51 71,40 71 Q29 71,21 65 C16 60,11 53,11 41 C11 23,26 11,40 11Z;
                    M40 10 C55 10,70 22,70 40 C70 52,65 60,60 65 Q52 72,40 72 Q28 72,20 65 C15 60,10 52,10 40 C10 22,25 10,40 10Z"
            dur="3s"
            repeatCount="indefinite"
          />
        </path>

        <ellipse cx="40" cy="58" rx="20" ry="8" fill={`url(#${id}-slime-shadow)`} opacity="0.4" />
        <ellipse cx="32" cy="28" rx="12" ry="8" fill={`url(#${id}-slime-highlight)`} />

        <ellipse cx="32" cy="38" rx="7" ry="8" fill="white" />
        <ellipse cx="33" cy="38" rx="5" ry="6" fill="#1E293B" />
        <ellipse cx="34.5" cy="36" rx="2.5" ry="3" fill="white" />
        <circle cx="30" cy="40" r="1.2" fill="white" opacity="0.6" />

        <ellipse cx="50" cy="38" rx="7" ry="8" fill="white" />
        <ellipse cx="51" cy="38" rx="5" ry="6" fill="#1E293B" />
        <ellipse cx="52.5" cy="36" rx="2.5" ry="3" fill="white" />
        <circle cx="48" cy="40" r="1.2" fill="white" opacity="0.6" />

        <path d="M35 48 Q40 53 45 48" fill="none" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" />

        <ellipse cx="26" cy="45" rx="4" ry="2.5" fill="#F472B6" opacity="0.3" />
        <ellipse cx="54" cy="45" rx="4" ry="2.5" fill="#F472B6" opacity="0.3" />

        <path d="M28 14 L25 4 L32 12" fill="#38BDF8" stroke="#0EA5E9" strokeWidth="0.5" />
        <path d="M48 12 L55 4 L52 14" fill="#38BDF8" stroke="#0EA5E9" strokeWidth="0.5" />
        <path d="M27 13 L26 6 L31 11" fill="#7DD3FC" opacity="0.5" />
        <path d="M49 11 L54 6 L51 13" fill="#7DD3FC" opacity="0.5" />

        <circle cx="62" cy="20" r="2" fill="#7DD3FC" opacity="0.4">
          <animate attributeName="cy" values="20;16;20" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="68" cy="28" r="1.5" fill="#38BDF8" opacity="0.3">
          <animate attributeName="cy" values="28;24;28" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

/**
 * 用于导航栏等小尺寸场景的简化版
 * 支持DB头像框图片URL
 */
export function AvatarFrameMini({
  frameId,
  frameImageUrl,
  size = 40,
  className = "",
}: {
  frameId?: string | null
  frameImageUrl?: string | null
  size?: number
  className?: string
}) {
  if ((!frameId || frameId === "none") && !frameImageUrl) return null

  // DB头像框图片
  if (frameImageUrl) {
    return (
      <Image
        src={frameImageUrl}
        alt="头像框"
        width={130}
        height={130}
        className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${className}`}
        unoptimized
      />
    )
  }

  // 内置史莱姆头像框
  if (frameId === "slime") {
    const containerSize = Math.round(size * 1.3)
    return (
      <div
        className={`pointer-events-none absolute ${className}`}
        style={{ width: containerSize, height: containerSize }}
      >
        <svg viewBox="0 0 100 100" width={containerSize} height={containerSize}>
          <defs>
            <linearGradient id="slime-mini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="53" r="36" fill="none" stroke="url(#slime-mini-grad)" strokeWidth="2" />
        </svg>
        <div style={{ position: 'absolute', right: -2, top: -4, width: size * 0.5, height: size * 0.5 }}>
          <svg viewBox="0 0 40 40" width="100%" height="100%">
            <path
              d="M20 5 C28 5, 35 12, 35 20 C35 28, 30 33, 25 35 Q20 38, 15 35 C10 33, 5 28, 5 20 C5 12, 12 5, 20 5Z"
              fill="#38BDF8" stroke="#0EA5E9" strokeWidth="0.5"
            />
            <circle cx="15" cy="20" r="3" fill="white" />
            <circle cx="15.5" cy="20" r="2" fill="#1E293B" />
            <circle cx="16" cy="19" r="1" fill="white" />
            <circle cx="25" cy="20" r="3" fill="white" />
            <circle cx="25.5" cy="20" r="2" fill="#1E293B" />
            <circle cx="26" cy="19" r="1" fill="white" />
            <path d="M17 25 Q20 28 23 25" fill="none" stroke="#1E293B" strokeWidth="1" strokeLinecap="round" />
            <path d="M14 8 L12 2 L17 7" fill="#38BDF8" />
            <path d="M23 7 L28 2 L26 8" fill="#38BDF8" />
          </svg>
        </div>
      </div>
    )
  }

  return null
}