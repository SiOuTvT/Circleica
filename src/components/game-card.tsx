"use client"

import { parseFileSizes, parseStringArray } from "@/lib/parse-utils"
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

  /* 收集平台/语言标签 */
  const platformTags = parseStringArray(game.platform)
  const languageTags = parseStringArray(game.language)
  const paramTags = [...platformTags, ...languageTags]
  const fileSizes = parseFileSizes(game.fileSize)

  return (
    <Link
      href={`/games/${game.id}`}
      className="game-card group block overflow-hidden rounded-2xl transition-all duration-300"
    >
      {/* ─── 封面：固定比例 ─── */}
      <div className="relative w-full" style={{ aspectRatio: "3 / 2" }}>
        {game.coverImage && !imgError ? (
          <Image
            src={game.coverImage}
            alt={game.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
            quality={75}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground/30">
            <ImageOff className="w-10 h-10" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* ─── 内容区：三层积木，flex-1 拉伸 ─── */}
      <div className="flex flex-col px-2.5 py-2 sm:px-3.5 sm:py-2.5 flex-1 min-h-0">

        {/* 第一层：游戏名称（flex-grow 吸收多余空白） */}
        <div className="flex items-start min-h-0 flex-1">
          <h3 className="game-card-title text-sm sm:text-[15px] font-bold leading-snug line-clamp-2">
            {game.title}
          </h3>
        </div>

        {/* 第二层：核心数据 */}
        <div className="flex items-center gap-2 sm:gap-3 pt-1.5">
          {viewStr && (
            <span className="game-card-stat flex items-center gap-1 text-[11px] sm:text-xs font-medium">
              <Eye className="w-3 h-3 sm:w-3 sm:h-3" strokeWidth={2} />
              {viewStr}
            </span>
          )}
          {dlStr && (
            <span className="game-card-stat flex items-center gap-1 text-[11px] sm:text-xs font-medium">
              <Download className="w-3 h-3 sm:w-3 sm:h-3" strokeWidth={2} />
              {dlStr}
            </span>
          )}
          {favStr && (
            <span className="game-card-stat flex items-center gap-1 text-[11px] sm:text-xs font-medium">
              <Heart className="w-3 h-3 sm:w-3 sm:h-3" strokeWidth={2} />
              {favStr}
            </span>
          )}
        </div>

        {/* 第三层：标签组 — 钉在底部 */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1 pt-1.5">
          {paramTags.map((tag, i) => (
            <span
              key={`p-${i}`}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-medium shrink-0 bg-primary/10 text-primary"
            >
              {tag}
            </span>
          ))}
          {fileSizes.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] shrink-0">
              {fileSizes.map((fs, i) => (
                <span key={`fs-${i}`} className="flex items-center">
                  <span className="font-medium text-primary">{fs.value} {fs.unit}</span>
                  {i < fileSizes.length - 1 && <span className="mx-0.5 text-muted-foreground/40">/</span>}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function GameCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card" style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.4), 1px solid rgba(255,255,255,0.08)' }}>
      {/* 封面 */}
      <div className="w-full skeleton-shimmer" style={{ aspectRatio: "3 / 2" }} />
      {/* 内容 */}
      <div className="flex flex-col px-2.5 py-2 sm:px-3.5 sm:py-2.5 flex-1 gap-1.5">
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-3/5 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-3">
          <div className="h-3 w-10 rounded skeleton-shimmer" />
          <div className="h-3 w-10 rounded skeleton-shimmer" />
          <div className="h-3 w-10 rounded skeleton-shimmer" />
        </div>
        <div className="flex flex-wrap gap-1">
          <div className="h-4 w-14 rounded-full skeleton-shimmer" />
          <div className="h-4 w-12 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}