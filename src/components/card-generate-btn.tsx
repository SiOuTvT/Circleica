"use client"

import { Download, Loader2 } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { formatZhDate } from "@/lib/date"
import { ROLE_META, type UserRole } from "@/lib/permissions"

interface CardData {
  username: string
  uid: string
  avatar: string | null
  composedAvatarUrl: string | null
  banner: string | null
  bio: string
  role: string
  createdAt: string
  favCount: number
  commentCount: number
  followerCount: number
  followingCount: number
  /** 当前选用的头像框图片 URL（叠加在头像上展示） */
  avatarFrameUrl?: string
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "w"
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(n)
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** 头像框默认是正方形 PNG，按 1:1 渲染在头像上方，尺寸比头像稍大形成"框"的效果 */
const AVATAR_CX = 82
const AVATAR_CY = 112
const AVATAR_R = 52
const FRAME_SIZE = 132

export function CardGenerateBtn({ data }: { data: CardData }) {
  const [generating, setGenerating] = useState(false)
  const avatarDataUrlRef = useRef<string>("")
  const frameDataUrlRef = useRef<string>("")

  async function preloadAsDataUrl(src: string): Promise<string> {
    try {
      const res = await fetch(src)
      if (!res.ok) return ""
      const blob = await res.blob()
      return await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch {
      return ""
    }
  }

  async function preloadAvatars(): Promise<{ avatar: string; frame: string }> {
    const avatar = await preloadAsDataUrl(data.composedAvatarUrl || data.avatar || "")
    const frame = data.avatarFrameUrl ? await preloadAsDataUrl(data.avatarFrameUrl) : ""
    return { avatar, frame }
  }

  async function generate() {
    if (generating) return
    setGenerating(true)

    try {
      const W = 1000, H = 560
      const { avatar: avatarDataUrl, frame: frameDataUrl } = await preloadAvatars()
      const joinDate = formatZhDate(data.createdAt)
      const roleMeta = ROLE_META[(data.role as UserRole)]
      const roleLabel = roleMeta?.label ?? ""
      const initials = data.username[0]?.toUpperCase() || "?"
      const bio = data.bio ? data.bio.slice(0, 90) : ""

      // 统计卡：收藏 / 关注者 / 关注中 / 评论
      const stats = [
        { label: "收藏", value: data.favCount },
        { label: "关注者", value: data.followerCount },
        { label: "关注中", value: data.followingCount },
        { label: "评论", value: data.commentCount },
      ]
      const statCards = stats.map((s, i) => {
        const x = 92 + i * 208
        return `
  <g>
    <rect x="${x}" y="392" width="184" height="86" rx="14" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <rect x="${x}" y="392" width="3" height="86" rx="1.5" fill="url(#statAccent)"/>
    <text x="${x + 92}" y="438" text-anchor="middle" fill="#ffffff" font-size="28" font-weight="bold" font-family="'Segoe UI', sans-serif">${formatNum(s.value)}</text>
    <text x="${x + 92}" y="462" text-anchor="middle" fill="rgba(255,255,255,0.38)" font-size="12" font-family="'Segoe UI', sans-serif" letter-spacing="2">${s.label}</text>
  </g>`
      }).join("")

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}">
      <stop offset="0" stop-color="#0b0c11"/>
      <stop offset="0.5" stop-color="#11131b"/>
      <stop offset="1" stop-color="#0d0e15"/>
    </linearGradient>
    <radialGradient id="glow1" cx="${W * 0.18}" cy="${H * 0.2}" r="320" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="rgba(95,168,160,0.10)"/>
      <stop offset="1" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="glow2" cx="${W * 0.85}" cy="${H * 0.78}" r="300" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="rgba(168,85,247,0.08)"/>
      <stop offset="1" stop-color="transparent"/>
    </radialGradient>
    <linearGradient id="accentLine" x1="0" y1="0" x2="${W}" y2="0">
      <stop offset="0" stop-color="rgba(95,168,160,0)"/>
      <stop offset="0.3" stop-color="rgba(95,168,160,0.65)"/>
      <stop offset="0.7" stop-color="rgba(168,85,247,0.65)"/>
      <stop offset="1" stop-color="rgba(168,85,247,0)"/>
    </linearGradient>
    <linearGradient id="avatarRing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgba(95,168,160,0.55)"/>
      <stop offset="1" stop-color="rgba(168,85,247,0.55)"/>
    </linearGradient>
    <linearGradient id="nameGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.82)"/>
    </linearGradient>
    <linearGradient id="statAccent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(95,168,160,0.9)"/>
      <stop offset="1" stop-color="rgba(168,85,247,0.9)"/>
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${AVATAR_R}"/>
    </clipPath>
    <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.5)" flood-opacity="0.6"/>
    </filter>
    <filter id="nameGlow">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- 背景 -->
  <rect x="0" y="0" width="${W}" height="${H}" rx="22" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="${H}" rx="22" fill="url(#glow1)"/>
  <rect x="0" y="0" width="${W}" height="${H}" rx="22" fill="url(#glow2)"/>

  <!-- 顶部渐变色带 -->
  <rect x="0" y="0" width="${W}" height="4" fill="url(#accentLine)"/>

  <!-- 装饰：右上角同心圆环 -->
  <g opacity="0.35">
    <circle cx="${W - 70}" cy="90" r="56" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
    <circle cx="${W - 70}" cy="90" r="40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    <circle cx="${W - 70}" cy="90" r="24" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
  </g>
  <!-- 装饰：左下角点阵 -->
  <g opacity="0.25" fill="rgba(255,255,255,0.10)">
    <circle cx="50" cy="${H - 60}" r="1.5"/><circle cx="66" cy="${H - 60}" r="1.5"/><circle cx="82" cy="${H - 60}" r="1.5"/>
    <circle cx="50" cy="${H - 44}" r="1.5"/><circle cx="66" cy="${H - 44}" r="1.5"/><circle cx="82" cy="${H - 44}" r="1.5"/>
    <circle cx="50" cy="${H - 28}" r="1.5"/><circle cx="66" cy="${H - 28}" r="1.5"/>
  </g>

  <!-- 外边框 -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="21" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>

  <!-- ═══ 头部区：头像 + 名牌 ═══ -->
  <g filter="url(#softShadow)">
    <!-- 头像底 -->
    <circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${AVATAR_R + 3}" fill="url(#avatarRing)"/>
    <circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${AVATAR_R}" fill="#15161c"/>
    ${avatarDataUrl
      ? `<image href="${avatarDataUrl}" x="${AVATAR_CX - AVATAR_R}" y="${AVATAR_CY - AVATAR_R}" width="${AVATAR_R * 2}" height="${AVATAR_R * 2}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
      : `<circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${AVATAR_R}" fill="url(#avatarRing)"/>
         <text x="${AVATAR_CX}" y="${AVATAR_CY + 12}" text-anchor="middle" fill="#ffffff" font-size="34" font-weight="bold" font-family="'Segoe UI', sans-serif">${initials}</text>`
    }
    <!-- 头像框叠加（关键：让头像框价值直接可见） -->
    ${frameDataUrl
      ? `<image href="${frameDataUrl}" x="${AVATAR_CX - FRAME_SIZE / 2}" y="${AVATAR_CY - FRAME_SIZE / 2}" width="${FRAME_SIZE}" height="${FRAME_SIZE}" preserveAspectRatio="xMidYMid meet"/>`
      : `<circle cx="${AVATAR_CX}" cy="${AVATAR_CY}" r="${AVATAR_R + 6}" fill="none" stroke="rgba(95,168,160,0.28)" stroke-width="1.5" stroke-dasharray="3 4"/>`
    }
  </g>

  <!-- 名牌区 -->
  <g>
    <text x="158" y="98" fill="url(#nameGrad)" font-size="30" font-weight="bold" font-family="'Segoe UI', sans-serif" filter="url(#nameGlow)">${escapeXml(data.username)}</text>
    <text x="160" y="122" fill="rgba(255,255,255,0.35)" font-size="13" font-family="'Segoe UI', sans-serif" letter-spacing="1">UID ${escapeXml(data.uid)}</text>
    ${roleLabel
      ? `<rect x="160" y="136" width="76" height="22" rx="11" fill="rgba(95,168,160,0.14)" stroke="rgba(95,168,160,0.35)" stroke-width="0.8"/>
         <text x="198" y="151" text-anchor="middle" fill="rgba(95,168,160,0.95)" font-size="12" font-family="'Segoe UI', sans-serif">${escapeXml(roleLabel)}</text>`
      : ""}
  </g>

  <!-- 简介 -->
  ${bio ? `<text x="52" y="196" fill="rgba(255,255,255,0.5)" font-size="14" font-family="'Segoe UI', sans-serif">${escapeXml(bio)}</text>` : ""}

  <!-- 分割线 -->
  <line x1="52" y1="230" x2="${W - 52}" y2="230" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <!-- 副站资料馆徽标区（品牌感） -->
  <text x="52" y="260" fill="rgba(255,255,255,0.22)" font-size="11" font-family="'Segoe UI', sans-serif" letter-spacing="3">CIRCLEICA · GALVELICA</text>
  <text x="${W - 52}" y="260" text-anchor="end" fill="rgba(255,255,255,0.16)" font-size="11" font-family="'Segoe UI', sans-serif">加入于 ${joinDate}</text>

  <!-- ═══ 统计卡 ═══ -->
  ${statCards}

  <!-- 底部品牌带 -->
  <rect x="0" y="${H - 46}" width="${W}" height="46" fill="rgba(0,0,0,0.18)"/>
  <text x="${W / 2}" y="${H - 20}" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="12" font-family="'Segoe UI', sans-serif" letter-spacing="6">C I R C L E I C A</text>
</svg>`

      // SVG → blob → download (2x 分辨率)
      const img = new Image()
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(svgBlob)

      await new Promise<void>((resolve) => {
        img.onload = () => {
          const canvas = document.createElement("canvas")
          canvas.width = W * 2
          canvas.height = H * 2
          const ctx = canvas.getContext("2d")!
          ctx.scale(2, 2)
          ctx.drawImage(img, 0, 0)
          canvas.toBlob((blob) => {
            if (blob) {
              const downloadUrl = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = downloadUrl
              a.download = `${data.username}_名片.png`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(downloadUrl)
            }
            URL.revokeObjectURL(url)
            resolve()
          }, "image/png")
        }
        img.src = url
      })

      toast.success("名片已生成")
    } catch (e) {
      logger.user.error("[名片生成]", e)
      toast.error("生成失败")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      onClick={generate}
      type="button"
      disabled={generating}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary disabled:opacity-60"
    >
      {generating ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" strokeWidth={2} />
      ) : (
        <Download className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
      )}
      <span className="text-xs font-medium text-foreground">
        {generating ? "生成中…" : "生成名片"}
      </span>
    </button>
  )
}
