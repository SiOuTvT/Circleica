"use client"

/**
 * 头像框组件
 * 提供多种风格的头像框，包括史莱姆主题头像框
 */

// 所有可用头像框定义
export const AVATAR_FRAMES = [
  { id: "none",      name: "无",         description: "不使用头像框" },
  { id: "slime",     name: "史莱姆",     description: "蓝色史莱姆光圈头像框" },
  { id: "sakura",    name: "樱花",       description: "粉色樱花飘落头像框" },
  { id: "starlight", name: "星光",       description: "紫色星光闪烁头像框" },
  { id: "aurora",    name: "极光",       description: "极光渐变头像框" },
  { id: "flame",     name: "烈焰",       description: "火焰燃烧头像框" },
] as const

export type FrameId = typeof AVATAR_FRAMES[number]["id"]

interface AvatarFrameProps {
  frameId: string
  size?: number          // 整体尺寸(px)，默认48
  className?: string
  children?: React.ReactNode // 头像内容放在内部
}

export function AvatarFrame({ frameId, size = 48, className = "", children }: AvatarFrameProps) {
  if (frameId === "none" || !frameId) {
    return <>{children}</>
  }

  // 所有头像框都使用 SVG 绘制，外层相对定位容器
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      {children}
      <div className="pointer-events-none absolute inset-0" style={{ width: size, height: size }}>
        {renderFrame(frameId, size)}
      </div>
    </div>
  )
}

function renderFrame(frameId: string, size: number) {
  switch (frameId) {
    case "slime":
      return <SlimeFrameSVG size={size} />
    case "sakura":
      return <SakuraFrameSVG size={size} />
    case "starlight":
      return <StarlightFrameSVG size={size} />
    case "aurora":
      return <AuroraFrameSVG size={size} />
    case "flame":
      return <FlameFrameSVG size={size} />
    default:
      return null
  }
}

/** 史莱姆头像框 - 一圈淡蓝色光圈，右上角史莱姆角色 */
function SlimeFrameSVG({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
      <defs>
        {/* 淡蓝色光圈渐变 */}
        <linearGradient id="slime-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7EDCBA" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#C8F2E4" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
        </linearGradient>
        {/* 光圈发光效果 */}
        <filter id="slime-blur">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        {/* 裁剪圆形 */}
        <clipPath id="slime-circle">
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>

      {/* 外层发光光圈 */}
      <circle cx="50" cy="50" r="49" fill="none" stroke="url(#slime-glow)" strokeWidth="3" filter="url(#slime-blur)" opacity="0.6" />
      {/* 主光圈边框 */}
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#slime-glow)" strokeWidth="2.5" />
      {/* 内层细边 */}
      <circle cx="50" cy="50" r="45" fill="none" stroke="#7EDCBA" strokeWidth="0.5" opacity="0.5" />

      {/* 右上角史莱姆角色 - 参考转生成史莱姆那档事的史莱姆 */}
      <g transform="translate(72, 8) scale(0.32)">
        {/* 史莱姆身体 - 圆润的果冻状 */}
        <ellipse cx="0" cy="18" rx="22" ry="18" fill="#5bb8f5">
          <animate attributeName="ry" values="18;19;18" dur="2s" repeatCount="indefinite" />
        </ellipse>
        {/* 身体高光 */}
        <ellipse cx="-6" cy="10" rx="8" ry="5" fill="#93d5ff" opacity="0.6" />
        {/* 身体底部阴影 */}
        <ellipse cx="0" cy="24" rx="16" ry="6" fill="#3a8fd4" opacity="0.4" />

        {/* 左眼 - 大眼睛 */}
        <ellipse cx="-7" cy="14" rx="4.5" ry="5" fill="white" />
        <ellipse cx="-6" cy="14" rx="3" ry="3.5" fill="#1a1a2e" />
        <circle cx="-5" cy="12.5" r="1.2" fill="white" />

        {/* 右眼 */}
        <ellipse cx="7" cy="14" rx="4.5" ry="5" fill="white" />
        <ellipse cx="8" cy="14" rx="3" ry="3.5" fill="#1a1a2e" />
        <circle cx="9" cy="12.5" r="1.2" fill="white" />

        {/* 嘴巴 - 微笑 */}
        <path d="M-4 20 Q0 24 4 20" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />

        {/* 头部的两个小角（利姆路的特征） */}
        <path d="M-10 2 L-8 -6 L-5 3" fill="#4aa8e8" />
        <path d="M5 3 L8 -6 L10 2" fill="#4aa8e8" />
        {/* 角的高光 */}
        <path d="M-9 1 L-8 -4 L-6 2" fill="#7cc5f5" opacity="0.6" />
        <path d="M6 2 L8 -4 L9 1" fill="#7cc5f5" opacity="0.6" />
      </g>

      {/* 一些小气泡装饰 */}
      <circle cx="82" cy="32" r="1.5" fill="#7EDCBA" opacity="0.5">
        <animate attributeName="cy" values="32;28;32" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="88" cy="24" r="1" fill="#60a5fa" opacity="0.4">
        <animate attributeName="cy" values="24;20;24" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="78" cy="28" r="0.8" fill="#818cf8" opacity="0.3">
        <animate attributeName="cy" values="28;25;28" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

/** 樱花头像框 */
function SakuraFrameSVG({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
      <defs>
        <linearGradient id="sakura-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f9a8d4" />
          <stop offset="50%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#sakura-grad)" strokeWidth="2.5" opacity="0.8" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#fbb6ce" strokeWidth="0.5" opacity="0.5" />
      {/* 樱花花瓣装饰 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <g key={i} transform={`rotate(${deg} 50 50)`}>
          <ellipse cx="50" cy="4" rx="3" ry="5" fill="#f9a8d4" opacity="0.7" />
        </g>
      ))}
      {/* 花瓣飘落动画 */}
      <g opacity="0.6">
        <ellipse cx="80" cy="15" rx="2.5" ry="4" fill="#fbcfe8" transform="rotate(30 80 15)">
          <animateTransform attributeName="transform" type="translate" values="0,0;3,8;0,0" dur="4s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="20" cy="85" rx="2" ry="3.5" fill="#f9a8d4" transform="rotate(-20 20 85)">
          <animateTransform attributeName="transform" type="translate" values="0,0;-3,-6;0,0" dur="3.5s" repeatCount="indefinite" />
        </ellipse>
      </g>
    </svg>
  )
}

/** 星光头像框 */
function StarlightFrameSVG({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
      <defs>
        <linearGradient id="star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#star-grad)" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#c4b5fd" strokeWidth="0.5" opacity="0.5" />
      {/* 星星闪烁 */}
      {[
        { x: 50, y: 2, s: 4 },
        { x: 98, y: 50, s: 3 },
        { x: 15, y: 5, s: 2.5 },
        { x: 85, y: 90, s: 2 },
      ].map((star, i) => (
        <g key={i} transform={`translate(${star.x}, ${star.y})`}>
          <polygon
            points={`0,-${star.s} ${star.s * 0.3},-${star.s * 0.3} ${star.s},0 ${star.s * 0.3},${star.s * 0.3} 0,${star.s} -${star.s * 0.3},${star.s * 0.3} -${star.s},0 -${star.s * 0.3},-${star.s * 0.3}`}
            fill="#c4b5fd"
          >
            <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
          </polygon>
        </g>
      ))}
    </svg>
  )
}

/** 极光头像框 */
function AuroraFrameSVG({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
      <defs>
        <linearGradient id="aurora-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399">
            <animate attributeName="stop-color" values="#34d399;#7EDCBA;#a78bfa;#34d399" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#7EDCBA">
            <animate attributeName="stop-color" values="#7EDCBA;#a78bfa;#34d399;#7EDCBA" dur="6s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#a78bfa">
            <animate attributeName="stop-color" values="#a78bfa;#34d399;#7EDCBA;#a78bfa" dur="6s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#aurora-grad)" strokeWidth="3" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="url(#aurora-grad)" strokeWidth="0.8" opacity="0.4" />
    </svg>
  )
}

/** 烈焰头像框 */
function FlameFrameSVG({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-lg">
      <defs>
        <linearGradient id="flame-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="url(#flame-grad)" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#fca5a5" strokeWidth="0.5" opacity="0.5" />
      {/* 火焰装饰 */}
      {[
        { x: 25, y: 3, s: 1, d: 0 },
        { x: 50, y: 1, s: 1.3, d: 0.3 },
        { x: 75, y: 3, s: 1, d: 0.6 },
        { x: 95, y: 25, s: 0.8, d: 0.9 },
        { x: 97, y: 50, s: 0.8, d: 1.2 },
      ].map((f, i) => (
        <g key={i} transform={`translate(${f.x}, ${f.y}) scale(${f.s})`}>
          <path d={`M0 0 Q-3 -6 0 -12 Q3 -6 0 0`} fill="#f97316" opacity="0.7">
            <animate attributeName="d" values="M0 0 Q-3 -6 0 -12 Q3 -6 0 0;M0 0 Q-4 -5 0 -10 Q4 -5 0 0;M0 0 Q-3 -6 0 -12 Q3 -6 0 0" dur={`${1.5 + f.d}s`} repeatCount="indefinite" />
          </path>
        </g>
      ))}
    </svg>
  )
}

/**
 * 用于导航栏等小尺寸场景的简化头像框
 * 只渲染外圈边框，不含装饰元素
 */
export function AvatarFrameMini({ frameId, size = 40, className = "" }: { frameId: string; size?: number; className?: string }) {
  if (frameId === "none" || !frameId) return null

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} style={{ width: size, height: size }}>
      {renderFrame(frameId, size)}
    </div>
  )
}