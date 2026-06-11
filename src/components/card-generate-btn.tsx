"use client"

import { Download, Loader2 } from "lucide-react"
import { useState } from "react"

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

function getRoleLabel(role: string) {
  if (role === "SUPER_ADMIN") return "站长"
  if (role === "ADMIN") return "管理员"
  return "用户"
}

export function CardGenerateBtn({ data }: { data: CardData }) {
  const [generating, setGenerating] = useState(false)

  async function generate() {
    setGenerating(true)
    try {
      const canvas = document.createElement("canvas")
      canvas.width = 600
      canvas.height = 340
      const ctx = canvas.getContext("2d")!
      const r = 16

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 600, 340)
      bg.addColorStop(0, "#1a1a2e")
      bg.addColorStop(1, "#16213e")
      ctx.fillStyle = bg
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(600 - r, 0)
      ctx.arcTo(600, 0, 600, r, r); ctx.lineTo(600, 340 - r)
      ctx.arcTo(600, 340, 600 - r, 340, r); ctx.lineTo(r, 340)
      ctx.arcTo(0, 340, 0, 340 - r, r); ctx.lineTo(0, r)
      ctx.arcTo(0, 0, r, 0, r); ctx.closePath(); ctx.fill()

      // Border
      ctx.strokeStyle = "rgba(255,255,255,0.12)"
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(600 - r, 0)
      ctx.arcTo(600, 0, 600, r, r); ctx.lineTo(600, 340 - r)
      ctx.arcTo(600, 340, 600 - r, 340, r); ctx.lineTo(r, 340)
      ctx.arcTo(0, 340, 0, 340 - r, r); ctx.lineTo(0, r)
      ctx.arcTo(0, 0, r, 0, r); ctx.closePath(); ctx.stroke()

      // Avatar
      const avatarSrc = data.composedAvatarUrl || data.avatar
      if (avatarSrc) {
        const img = await loadImage(avatarSrc)
        ctx.save()
        ctx.beginPath()
        ctx.arc(70, 70, 42, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        ctx.drawImage(img, 28, 28, 84, 84)
        ctx.restore()
      } else {
        ctx.fillStyle = "#6366f1"
        ctx.beginPath()
        ctx.arc(70, 70, 42, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = "#fff"
        ctx.font = "bold 28px sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(data.username[0]?.toUpperCase() || "?", 70, 80)
      }

      // Ring
      ctx.strokeStyle = "#6366f1"
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(70, 70, 42, 0, Math.PI * 2)
      ctx.stroke()

      // Username + role badge
      ctx.textAlign = "start"
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 22px sans-serif"
      ctx.fillText(data.username, 125, 55)
      ctx.fillStyle = "#a1a1aa"
      ctx.font = "14px sans-serif"
      ctx.fillText(`UID: ${data.uid}`, 125, 78)

      ctx.fillStyle = "#6366f1"
      ctx.font = "12px sans-serif"
      ctx.fillText(getRoleLabel(data.role), 125, 95)

      // Bio
      if (data.bio) {
        ctx.fillStyle = "#a1a1aa"
        ctx.font = "14px sans-serif"
        const lines = wrapText(ctx, data.bio, 440)
        if (lines.length > 0) ctx.fillText(lines[0], 30, 150)
        if (lines.length > 1) ctx.fillText(lines[1], 30, 168)
      }

      // Stats
      const stats = [
        { label: "收藏", value: data.favCount },
        { label: "关注者", value: data.followerCount },
        { label: "关注中", value: data.followingCount },
        { label: "评论", value: data.commentCount },
      ]
      const startX = 30
      const y = 210
      stats.forEach((s, i) => {
        const x = startX + i * 140
        ctx.fillStyle = "#a1a1aa"
        ctx.font = "12px sans-serif"
        ctx.fillText(s.label, x, y)
        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 24px sans-serif"
        ctx.fillText(String(s.value), x, y + 32)
      })

      // Brand
      ctx.fillStyle = "rgba(255,255,255,0.25)"
      ctx.font = "11px sans-serif"
      ctx.textAlign = "right"
      ctx.fillText("同人游戏站 · fangame", 570, 320)

      // Join date
      ctx.textAlign = "start"
      ctx.fillStyle = "rgba(255,255,255,0.35)"
      ctx.fillText(`加入于 ${new Date(data.createdAt).toLocaleDateString("zh-CN")}`, 30, 320)

      // Download
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${data.username}_名片.png`
        a.click()
        URL.revokeObjectURL(url)
        setGenerating(false)
      }, "image/png")
    } catch {
      setGenerating(false)
    }
  }

  return (
    <button
      onClick={generate}
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ""
  for (const char of text) {
    const test = current + char
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = char
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}