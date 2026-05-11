"use client"

import { Calendar, Download, Eye, Globe, HardDrive, Heart, ImageOff, Monitor } from "lucide-react"
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

/* ─── 薄荷青标签 ─── */
function MintTag({ icon, text }: { icon: React.ReactNode; text: string }) {
  if (!text) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-medium leading-none"
      style={{
        backgroundColor: "rgba(167, 243, 208, 0.15)",
        color: "rgb(5, 150, 105)",
      }}
    >
      {icon}
      {text}
    </span>
  )
}

/* ─── 格式化日期 ─── */
function formatDate(d?: Date | string): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

export function GameCard({ game }: { game: GameCardData }) {
  const [imgError, setImgError] = useState(false)
  const [showDesc, setShowDesc] = useState(false)

  const viewStr = game.viewCount != null ? String(game.viewCount) : ""
  const dlStr = game.downloadCount != null ? String(game.downloadCount) : ""
  const favStr = game.favoriteCount != null ? String(game.favoriteCount) : ""
  const dateStr = formatDate(game.updatedAt || game.createdAt)

  return (
    <Link
      href={`/games/${game.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[32px] border border-white/10 transition-transform duration-300 hover:-translate-y-1 active:scale-[0.98]"
      style={{
        background: "hsl(var(--card))",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)",
      }}
      onMouseEnter={() => setShowDesc(true)}
      onMouseLeave={() => setShowDesc(false)}
    >
      {/* ─── 封面图 60% ─── */}
      <div className="relative w-full" style={{ paddingBottom: "80%" }}>
        {game.coverImage && !imgError ? (
          <Image
            src={game.coverImage}
            alt={game.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground/30">
            <ImageOff className="w-10 h-10" strokeWidth={1} />
          </div>
        )}

        {/* NSFW 遮罩 */}
        {game.isNsfw && (
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[8px] transition-opacity duration-300 group-hover:opacity-0" />
        )}

        {/* 悬停时简介 overlay（磨砂玻璃） */}
        {game.description && showDesc && (
          <div className="absolute inset-0 flex items-end p-3 bg-black/40 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-[11px] leading-relaxed text-white/80 line-clamp-4">
              {game.description}
            </p>
          </div>
        )}
      </div>

      {/* ─── 文字信息区 40% ─── */}
      <div className="flex flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4 gap-0">

        {/* 第一层 · 标题 (40%) */}
        <div className="flex items-center min-h-0 flex-shrink-0 mb-2">
          <h3 className="text-[14px] sm:text-[15px] font-bold leading-snug text-foreground line-clamp-2">
            {game.title}
          </h3>
        </div>

        {/* 第二层 · 人气数据 (20%) - 薄荷青标签 */}
        {(viewStr || dlStr || favStr) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {viewStr && <MintTag icon={<Eye className="w-[10px] h-[10px]" strokeWidth={2.5} />} text={viewStr} />}
            {dlStr && <MintTag icon={<Download className="w-[10px] h-[10px]" strokeWidth={2.5} />} text={dlStr} />}
            {favStr && <MintTag icon={<Heart className="w-[10px] h-[10px]" strokeWidth={2.5} />} text={favStr} />}
          </div>
        )}

        {/* 第三层 · 硬核参数 (25%) - 薄荷青标签 */}
        {(game.platform || game.language || game.fileSize) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {game.platform && <MintTag icon={<Monitor className="w-[10px] h-[10px]" strokeWidth={2.5} />} text={game.platform} />}
            {game.language && <MintTag icon={<Globe className="w-[10px] h-[10px]" strokeWidth={2.5} />} text={game.language} />}
            {game.fileSize && <MintTag icon={<HardDrive className="w-[10px] h-[10px]" strokeWidth={2.5} />} text={game.fileSize} />}
          </div>
        )}

        {/* 弹性留白 */}
        <div className="flex-1" />

        {/* 第四层 · 底部日期 (15%) - 贴底 */}
        {dateStr && (
          <div className="flex items-center gap-1 mt-auto pt-1">
            <Calendar className="w-[9px] h-[9px] text-foreground/20" strokeWidth={2} />
            <span className="text-[10px] text-foreground/30">{dateStr}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export function GameCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[32px] border border-white/10 bg-card">
      {/* 封面区域 */}
      <div className="w-full skeleton-shimmer" style={{ paddingBottom: "80%" }} />

      {/* 信息区域 */}
      <div className="flex flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4 gap-2">
        {/* 标题 */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-full rounded skeleton-shimmer" />
          <div className="h-3.5 w-3/5 rounded skeleton-shimmer" />
        </div>
        {/* 人气标签 */}
        <div className="flex gap-1.5">
          <div className="h-[18px] w-10 rounded-full skeleton-shimmer" />
          <div className="h-[18px] w-10 rounded-full skeleton-shimmer" />
          <div className="h-[18px] w-10 rounded-full skeleton-shimmer" />
        </div>
        {/* 参数标签 */}
        <div className="flex gap-1.5">
          <div className="h-[18px] w-8 rounded-full skeleton-shimmer" />
          <div className="h-[18px] w-12 rounded-full skeleton-shimmer" />
          <div className="h-[18px] w-14 rounded-full skeleton-shimmer" />
        </div>
        {/* 日期 */}
        <div className="mt-auto pt-1">
          <div className="h-2.5 w-16 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}