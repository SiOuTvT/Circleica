"use client"

import { Download, Eye, Heart, ImageOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export interface GameCardData {
  id: string
  title: string
  coverImage: string
  description?: string
  tags: { name: string; color: string }[]
  favoriteCount: number
  viewCount?: number
  downloadCount?: number
  platform?: string
  language?: string
  fileSize?: string
  updatedAt?: Date | string
  createdAt?: Date | string
  isNsfw: boolean
  status: string
}

/* ─── 格式化日期 ─── */
function formatDate(d?: Date | string): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

/* ─── 格式化数字 ─── */
function fmtNum(n?: number): string {
  if (n == null) return ""
  if (n >= 10000) return (n / 10000).toFixed(1) + "w"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}

export function GameCard({ game }: { game: GameCardData }) {
  const [imgError, setImgError] = useState(false)

  const viewStr = fmtNum(game.viewCount)
  const dlStr = fmtNum(game.downloadCount)
  const favStr = fmtNum(game.favoriteCount)
  const dateStr = formatDate(game.updatedAt || game.createdAt)

  /* 收集参数标签 */
  const params: { icon: React.ReactNode; text: string }[] = []
  if (game.platform) params.push({ icon: <span>🖥</span>, text: game.platform })
  if (game.language) params.push({ icon: <span>🌐</span>, text: game.language })
  if (game.fileSize) params.push({ icon: <span>💾</span>, text: game.fileSize })

  return (
    <Link
      href={`/games/${game.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl transition-transform duration-200 hover:-translate-y-1"
      style={{
        background: "hsl(var(--card))",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: "1px solid hsl(var(--border))",
      }}
    >
      {/* ─── 封面图 50% ─── */}
      <div className="relative w-full" style={{ height: "50%" }}>
        <div className="relative w-full" style={{ paddingBottom: "100%" }}>
          {game.coverImage && !imgError ? (
            <Image
              src={game.coverImage}
              alt={game.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground/30">
              <ImageOff className="w-10 h-10" strokeWidth={1} />
            </div>
          )}
        </div>
      </div>

      {/* ─── 文字区 50% ─── */}
      <div className="flex flex-1 flex-col p-6">

        {/* 标题层 (40%) */}
        <div className="flex-[40] flex items-start min-h-0">
          <h3 className="text-[22px] font-extrabold leading-tight text-foreground line-clamp-2">
            {game.title}
          </h3>
        </div>

        {/* 人气数据层 (15%) — 纯文字+极简图标，中灰 12px，无背景色 */}
        {(viewStr || dlStr || favStr) && (
          <div className="flex-[15] flex items-center gap-4">
            {viewStr && (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <Eye className="w-3 h-3" strokeWidth={2} />
                {viewStr}
              </span>
            )}
            {dlStr && (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <Download className="w-3 h-3" strokeWidth={2} />
                {dlStr}
              </span>
            )}
            {favStr && (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <Heart className="w-3 h-3" strokeWidth={2} />
                {favStr}
              </span>
            )}
          </div>
        )}

        {/* 核心参数层 (30%) — 冰氧薄荷胶囊标签 */}
        {params.length > 0 && (
          <div className="flex-[30] flex flex-wrap items-center gap-2">
            {params.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm"
                style={{
                  backgroundColor: "rgba(200, 242, 228, 0.4)",
                  color: "#065F46",
                  fontSize: "14px",
                }}
              >
                {p.icon}
                {p.text}
              </span>
            ))}
          </div>
        )}

        {/* 日期收尾层 (15%) — 11px 极淡灰，贴底 */}
        <div className="flex-[15] flex items-end">
          {dateStr && (
            <span className="text-[11px] text-neutral-300">{dateStr}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function GameCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {/* 封面 50% */}
      <div className="w-full skeleton-shimmer" style={{ height: "50%" }}>
        <div className="w-full" style={{ paddingBottom: "100%" }} />
      </div>

      {/* 文字区 50% */}
      <div className="flex flex-1 flex-col p-6 gap-3">
        {/* 标题 */}
        <div className="flex-[40] space-y-2">
          <div className="h-6 w-full rounded skeleton-shimmer" />
          <div className="h-6 w-3/5 rounded skeleton-shimmer" />
        </div>
        {/* 人气 */}
        <div className="flex-[15] flex gap-4">
          <div className="h-4 w-12 rounded skeleton-shimmer" />
          <div className="h-4 w-12 rounded skeleton-shimmer" />
          <div className="h-4 w-12 rounded skeleton-shimmer" />
        </div>
        {/* 参数 */}
        <div className="flex-[30] flex gap-2">
          <div className="h-7 w-16 rounded-full skeleton-shimmer" />
          <div className="h-7 w-14 rounded-full skeleton-shimmer" />
          <div className="h-7 w-18 rounded-full skeleton-shimmer" />
        </div>
        {/* 日期 */}
        <div className="flex-[15] flex items-end">
          <div className="h-3 w-20 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}