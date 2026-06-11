"use client"

import { Download, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

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
  return null
}

export function CardGenerateBtn({ data }: { data: CardData }) {
  const [generating, setGenerating] = useState(false)

  async function generate() {
    setGenerating(true)
    try {
      const W = 900, H = 500
      const canvas = document.createElement("canvas")
      canvas.width = W * 2
      canvas.height = H * 2
      const ctx = canvas.getContext("2d")!
      ctx.scale(2, 2)

      const R = 20

      // ── 辅助：圆角矩形 ──
      function roundRect(x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y)
        ctx.arcTo(x + w, y, x + w, y + r, r)
        ctx.lineTo(x + w, y + h - r)
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
        ctx.lineTo(x + r, y + h)
        ctx.arcTo(x, y + h, x, y + h - r, r)
        ctx.lineTo(x, y + r)
        ctx.arcTo(x, y, x + r, y, r)
        ctx.closePath()
      }

      // ── 背景 ──
      roundRect(0, 0, W, H, R)
      ctx.fillStyle = "#0f0f14"
      ctx.fill()

      // ── 柔和光晕装饰 ──
      const glow = ctx.createRadialGradient(W * 0.75, H * 0.2, 0, W * 0.75, H * 0.2, 300)
      glow.addColorStop(0, "rgba(168, 85, 247, 0.08)")
      glow.addColorStop(1, "rgba(168, 85, 247, 0)")
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      const glow2 = ctx.createRadialGradient(W * 0.2, H * 0.8, 0, W * 0.2, H * 0.8, 250)
      glow2.addColorStop(0, "rgba(232, 120, 154, 0.06)")
      glow2.addColorStop(1, "rgba(232, 120, 154, 0)")
      ctx.fillStyle = glow2
      ctx.fillRect(0, 0, W, H)

      // ── 极细边框 ──
      roundRect(0.5, 0.5, W - 1, H - 1, R)
      ctx.strokeStyle = "rgba(255,255,255,0.08)"
      ctx.lineWidth = 1
      ctx.stroke()

      // ── 头像 ──
      const avatarSrc = data.composedAvatarUrl || data.avatar
      const acx = 80, acy = 100, ar = 48

      if (avatarSrc) {
        try {
          const img = await loadImage(avatarSrc)
          ctx.save()
          ctx.beginPath()
          ctx.arc(acx, acy, ar, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
          ctx.drawImage(img, acx - ar, acy - ar, ar * 2, ar * 2)
          ctx.restore()
        } catch {
          drawFallbackAvatar(ctx, acx, acy, ar, data.username)
        }
      } else {
        drawFallbackAvatar(ctx, acx, acy, ar, data.username)
      }

      // 头像光环
      ctx.strokeStyle = "rgba(232, 120, 154, 0.5)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(acx, acy, ar + 1, 0, Math.PI * 2)
      ctx.stroke()

      // ── 用户名 ──
      const textX = acx + ar + 20
      ctx.textAlign = "start"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "#ffffff"
      ctx.font = "bold 28px 'Noto Sans SC', sans-serif"
      ctx.fillText(data.username, textX, acy - 18)

      // UID
      ctx.fillStyle = "rgba(255,255,255,0.35)"
      ctx.font = "13px 'Noto Sans SC', sans-serif"
      ctx.fillText(`UID: ${data.uid}`, textX, acy + 10)

      // 角色标签
      const roleLabel = getRoleLabel(data.role)
      if (roleLabel) {
        const roleX = textX + ctx.measureText(`UID: ${data.uid}`).width + 14
        ctx.font = "11px 'Noto Sans SC', sans-serif"
        const tw = ctx.measureText(roleLabel).width
        roundRect(roleX, acy + 2, tw + 14, 20, 10)
        ctx.fillStyle = "rgba(232, 120, 154, 0.2)"
        ctx.fill()
        roundRect(roleX, acy + 2, tw + 14, 20, 10)
        ctx.strokeStyle = "rgba(232, 120, 154, 0.35)"
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.fillStyle = "rgba(232, 120, 154, 0.9)"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(roleLabel, roleX + (tw + 14) / 2, acy + 12)
      }

      // ── 简介 ──
      ctx.textAlign = "start"
      ctx.textBaseline = "alphabetic"
      if (data.bio) {
        ctx.fillStyle = "rgba(255,255,255,0.5)"
        ctx.font = "14px 'Noto Sans SC', sans-serif"
        const lines = wrapText(ctx, data.bio, W - 120)
        lines.slice(0, 2).forEach((line, i) => {
          ctx.fillText(line, 50, 175 + i * 22)
        })
      }

      // ── 分隔线 ──
      ctx.strokeStyle = "rgba(255,255,255,0.06)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(50, 225)
      ctx.lineTo(W - 50, 225)
      ctx.stroke()

      // ── 统计数据 ──
      const stats = [
        { label: "收藏", value: data.favCount },
        { label: "关注者", value: data.followerCount },
        { label: "关注中", value: data.followingCount },
        { label: "评论", value: data.commentCount },
      ]
      const statsY = 270
      const colW = (W - 100) / 4

      stats.forEach((s, i) => {
        const cx = 50 + i * colW + colW / 2

        ctx.textAlign = "center"
        ctx.fillStyle = "rgba(255,255,255,0.35)"
        ctx.font = "12px 'Noto Sans SC', sans-serif"
        ctx.fillText(s.label, cx, statsY)

        ctx.fillStyle = "#ffffff"
        ctx.font = "bold 32px 'Noto Sans SC', sans-serif"
        ctx.fillText(formatNum(s.value), cx, statsY + 44)
      })

      // ── 底部分隔线 ──
      ctx.strokeStyle = "rgba(255,255,255,0.06)"
      ctx.beginPath()
      ctx.moveTo(50, 350)
      ctx.lineTo(W - 50, 350)
      ctx.stroke()

      // ── 底部信息 ──
      ctx.textBaseline = "alphabetic"
      ctx.textAlign = "start"
      ctx.fillStyle = "rgba(255,255,255,0.25)"
      ctx.font = "12px 'Noto Sans SC', sans-serif"
      const joinDate = new Date(data.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
      ctx.fillText(`加入于 ${joinDate}`, 50, 380)

      // 站点标识
      ctx.textAlign = "right"
      ctx.fillStyle = "rgba(255,255,255,0.15)"
      ctx.font = "11px 'Noto Sans SC', sans-serif"
      ctx.fillText("同人游戏站 · fangame", W - 50, 380)

      // ── 底部装饰线（主题色） ──
      const lineGrad = ctx.createLinearGradient(0, H - 4, W, H - 4)
      lineGrad.addColorStop(0, "rgba(232, 120, 154, 0)")
      lineGrad.addColorStop(0.3, "rgba(232, 120, 154, 0.6)")
      lineGrad.addColorStop(0.7, "rgba(168, 85, 247, 0.6)")
      lineGrad.addColorStop(1, "rgba(168, 85, 247, 0)")
      ctx.fillStyle = lineGrad
      roundRect(0, H - 3, W, 3, 0)
      ctx.fill()

      // ── 下载 ──
      canvas.toBlob((blob) => {
        if (!blob) { setGenerating(false); return }
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${data.username}_名片.png`
        a.click()
        URL.revokeObjectURL(url)
        setGenerating(false)
      }, "image/png")
    } catch (e) {
      console.error("[名片生成]", e)
      toast.error("生成失败，请重试")
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

// ── 工具函数 ──

function drawFallbackAvatar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, name: string) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  grad.addColorStop(0, "#e8789a")
  grad.addColorStop(1, "#a855f7")
  ctx.fillStyle = grad
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  ctx.fillStyle = "#fff"
  ctx.font = "bold 32px 'Noto Sans SC', sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(name[0]?.toUpperCase() || "?", cx, cy)
  ctx.restore()
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "w"
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  return String(n)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    // 同源 URL（/uploads/...）不设置 crossOrigin，避免 canvas 被污染
    if (src.startsWith("/") || src.startsWith(window.location.origin)) {
      img.src = src
    } else {
      img.crossOrigin = "anonymous"
      img.src = src
    }
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ""
  for (const char of text) {
    const test = current + char
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current + "…")
      current = ""
      break
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}
