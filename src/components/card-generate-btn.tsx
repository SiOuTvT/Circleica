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
}

// 角色标签统一使用 @/lib/permissions 的 ROLE_META

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "w"
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(n)
}

export function CardGenerateBtn({ data }: { data: CardData }) {
  const [generating, setGenerating] = useState(false)
  const svgRef = useRef<string>("")
  const avatarDataUrlRef = useRef<string>("")

  async function preloadAvatar(): Promise<string> {
    if (avatarDataUrlRef.current) return avatarDataUrlRef.current

    const src = data.composedAvatarUrl || data.avatar
    if (!src) return ""

    try {
      const res = await fetch(src)
      if (!res.ok) return ""
      const blob = await res.blob()
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      avatarDataUrlRef.current = dataUrl
      return dataUrl
    } catch {
      return ""
    }
  }

  async function generate() {
    if (generating) return
    setGenerating(true)

    try {
      const W = 900, H = 500
      const avatarDataUrl = await preloadAvatar()
      const joinDate = formatZhDate(data.createdAt)
      const roleLabel = ROLE_META[(data.role as UserRole)].label
      const initials = data.username[0]?.toUpperCase() || "?"
      const bio = data.bio ? data.bio.slice(0, 80) : ""

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}">
      <stop offset="0" stop-color="#0f0f14"/>
      <stop offset="1" stop-color="#12121a"/>
    </linearGradient>
    <radialGradient id="glow1" cx="${W * 0.75}" cy="${H * 0.15}" r="280" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="rgba(168, 85, 247, 0.07)"/>
      <stop offset="1" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="glow2" cx="${W * 0.15}" cy="${H * 0.85}" r="240" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="rgba(232, 120, 154, 0.05)"/>
      <stop offset="1" stop-color="transparent"/>
    </radialGradient>
    <linearGradient id="accentLine" x1="0" y1="0" x2="${W}" y2="0">
      <stop offset="0" stop-color="rgba(232, 120, 154, 0)"/>
      <stop offset="0.35" stop-color="rgba(232, 120, 154, 0.5)"/>
      <stop offset="0.65" stop-color="rgba(168, 85, 247, 0.5)"/>
      <stop offset="1" stop-color="rgba(168, 85, 247, 0)"/>
    </linearGradient>
    <linearGradient id="avatarGrad" x1="32" y1="57" x2="128" y2="153">
      <stop offset="0" stop-color="#e8789a"/>
      <stop offset="1" stop-color="#a855f7"/>
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="80" cy="105" r="48"/>
    </clipPath>
  </defs>

  <!-- 背景 -->
  <rect x="0" y="0" width="${W}" height="${H}" rx="20" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="${H}" rx="20" fill="url(#glow1)"/>
  <rect x="0" y="0" width="${W}" height="${H}" rx="20" fill="url(#glow2)"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <!-- 头像 -->
  ${avatarDataUrl
    ? `<image href="${avatarDataUrl}" x="32" y="57" width="96" height="96" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="80" cy="105" r="48" fill="url(#avatarGrad)"/>
       <text x="80" y="109" text-anchor="middle" fill="#ffffff" font-size="30" font-weight="bold" font-family="sans-serif">${initials}</text>`
  }
  <circle cx="80" cy="105" r="50" fill="none" stroke="rgba(232, 120, 154, 0.4)" stroke-width="2"/>

  <!-- 用户名 + UID + 角色标签 -->
  <text x="148" y="98" fill="#ffffff" font-size="26" font-weight="bold" font-family="sans-serif">${escapeXml(data.username)}</text>
  <text x="148" y="122" fill="rgba(255,255,255,0.3)" font-size="12" font-family="sans-serif">UID: ${data.uid}</text>
  ${roleLabel
    ? `<rect x="236" y="111" width="60" height="18" rx="9" fill="rgba(232, 120, 154, 0.15)" stroke="rgba(232, 120, 154, 0.3)" stroke-width="0.5"/>
       <text x="266" y="124" text-anchor="middle" fill="rgba(232, 120, 154, 0.9)" font-size="11" font-family="sans-serif">${roleLabel}</text>`
    : ""}

  <!-- 简介 -->
  ${bio ? `<text x="50" y="170" fill="rgba(255,255,255,0.4)" font-size="13" font-family="sans-serif">${escapeXml(bio)}</text>` : ""}

  <!-- 分割线 -->
  <line x1="50" y1="220" x2="${W - 50}" y2="220" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>

  <!-- 统计数据 -->
  <text x="${W / 2}" y="260" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="12" font-family="sans-serif">
    ${["收藏", "关注者", "关注中", "评论"].map((l, i) => `<tspan x="${50 + i * 200 + 100}" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="12" font-family="sans-serif">${l}</tspan>`).join("")}
  </text>
  <text y="302">
    ${[data.favCount, data.followerCount, data.followingCount, data.commentCount].map((v, i) => `<tspan x="${50 + i * 200 + 100}" text-anchor="middle" fill="#ffffff" font-size="30" font-weight="bold" font-family="sans-serif">${formatNum(v)}</tspan>`).join("")}
  </text>

  <!-- 分割线 -->
  <line x1="50" y1="345" x2="${W - 50}" y2="345" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>

  <!-- 底部信息 -->
  <text x="50" y="375" fill="rgba(255,255,255,0.2)" font-size="12" font-family="sans-serif">加入于 ${joinDate}</text>
  <text x="${W - 50}" y="375" text-anchor="end" fill="rgba(255,255,255,0.12)" font-size="11" font-family="sans-serif">Circleica</text>

  <!-- 底部装饰线 -->
  <rect x="0" y="${H - 3}" width="${W}" height="3" fill="url(#accentLine)"/>
</svg>`

      svgRef.current = svg

      // SVG → blob → download
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

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}