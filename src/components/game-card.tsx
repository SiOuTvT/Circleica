"use client"

import { Download, Eye, Heart, ImageOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export interface GameCardData {
  id: string
  title: string
  coverImage: string
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

  /* 收集平台/语言/大小标签 */
  const paramTags: string[] = []
  if (game.platform) paramTags.push(game.platform)
  if (game.language) paramTags.push(game.language)
  if (game.fileSize) paramTags.push(game.fileSize)

  return (
    <Link
      href={`/games/${game.id}`}
      className="group block overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      style={{
        background: "hsl(var(--card))",
        boxShadow: "0 2px 8px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
        border: "1px solid hsl(var(--border))",
        aspectRatio: "3 / 4",
      }}
    >
      {/* ─── 封面 50% ─── */}
      <div className="relative w-full" style={{ height: "50%" }}>
        {game.coverImage && !imgError ? (
          <Image
            src={game.coverImage}
            alt={game.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground/30">
            <ImageOff className="w-10 h-10" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* ─── 内容区 50% ─── */}
      <div className="flex flex-col px-3 py-2 sm:px-4 sm:py-3 overflow-hidden" style={{ height: "50%" }}>

        {/* 标题 (40%) — 大字，加粗 */}
        <div className="flex-[40] flex items-start min-h-0">
          <h3 className="text-base sm:text-lg font-bold leading-snug text-foreground line-clamp-2">
            {game.title}
          </h3>
        </div>

        {/* 人气数据 (20%) — 灰色，低调 */}
        <div className="flex-[16] flex items-center gap-3 sm:gap-4">
          {viewStr && (
            <span className="flex items-center gap-1 text-xs sm:text-sm font-medium text-muted-foreground/70">
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2} />
              {viewStr}
            </span>
          )}
          {dlStr && (
            <span className="flex items-center gap-1 text-xs sm:text-sm font-medium text-muted-foreground/70">
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2} />
              {dlStr}
            </span>
          )}
          {favStr && (
            <span className="flex items-center gap-1 text-xs sm:text-sm font-medium text-muted-foreground/70">
              <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2} />
              {favStr}
            </span>
          )}
        </div>

        {/* 标签 (34%) — 主题青色胶囊，自动换行 */}
        <div className="flex-[34] flex flex-wrap items-center gap-1 sm:gap-1.5 min-h-0 overflow-hidden">
          {paramTags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium shrink-0 bg-primary/10 text-primary"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 日期 (10%) — 极淡灰，贴底 */}
        <div className="flex-[10] flex items-end min-h-0">
          {dateStr && (
            <span className="text-[10px] sm:text-[11px] text-muted-foreground/60">{dateStr}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function GameCardSkeleton() {
  return (
    <div className="block overflow-hidden rounded-2xl border border-border bg-card" style={{ aspectRatio: "2 / 3" }}>
      {/* 封面 50% */}
      <div className="w-full skeleton-shimmer" style={{ height: "50%" }} />
      {/* 内容 50% */}
      <div className="flex flex-col px-3 py-2 sm:px-4 sm:py-3 gap-1.5" style={{ height: "50%" }}>
        <div className="flex-[40] space-y-1.5">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-3/5 rounded skeleton-shimmer" />
        </div>
        <div className="flex-[16] flex gap-3">
          <div className="h-4 w-10 rounded skeleton-shimmer" />
          <div className="h-4 w-10 rounded skeleton-shimmer" />
          <div className="h-4 w-10 rounded skeleton-shimmer" />
        </div>
        <div className="flex-[34] flex flex-wrap gap-1.5">
          <div className="h-5 w-14 rounded-full skeleton-shimmer" />
          <div className="h-5 w-12 rounded-full skeleton-shimmer" />
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
        </div>
        <div className="flex-[10] flex items-end">
          <div className="h-3 w-20 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}