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

  const platformTags = parseStringArray(game.platform)
  const languageTags = parseStringArray(game.language)
  const paramTags = [...platformTags, ...languageTags]
  const fileSizes = parseFileSizes(game.fileSize)

  return (
    <Link
      href={`/games/${game.id}`}
      className="game-card group flex flex-col overflow-hidden rounded-2xl transition-all duration-300"
    >
      {/* ─── 封面：更矮，更克制 ─── */}
      <div className="relative w-full" style={{ aspectRatio: "3 / 2" }}>
        {game.coverImage && !imgError ? (
          <Image
            src={game.coverImage}
            alt={game.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
            quality={75}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground/30">
            <ImageOff className="w-8 h-8" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* ─── 内容区：均匀分布 ─── */}
      <div className="flex flex-col flex-1 justify-between px-2 pt-2 pb-3 sm:px-4 sm:pt-3.5 sm:pb-5">

        {/* 标题：自然换行 */}
        <h3 className="game-card-title text-[15px] sm:text-base font-semibold leading-relaxed">
          {game.title}
        </h3>

        {/* 数据行 */}
        <div className="flex items-center gap-3.5">
          {viewStr && (
            <span className="game-card-stat flex items-center gap-1.5 text-sm sm:text-[13px] font-normal">
              <Eye className="w-[18px] h-[18px] sm:w-4 sm:h-4" strokeWidth={1.5} />
              {viewStr}
            </span>
          )}
          {dlStr && (
            <span className="game-card-stat flex items-center gap-1.5 text-sm sm:text-[13px] font-normal">
              <Download className="w-[18px] h-[18px] sm:w-4 sm:h-4" strokeWidth={1.5} />
              {dlStr}
            </span>
          )}
          {favStr && (
            <span className="game-card-stat flex items-center gap-1.5 text-sm sm:text-[13px] font-normal">
              <Heart className="w-[18px] h-[18px] sm:w-4 sm:h-4" strokeWidth={1.5} />
              {favStr}
            </span>
          )}
        </div>

        {/* 标签区域 */}
        {(paramTags.length > 0 || fileSizes.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-1.5 mt-3">
            {paramTags.map((tag, i) => (
              <span
                key={`p-${i}`}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs sm:text-[11px] font-normal shrink-0 bg-primary/10 text-primary"
              >
                {tag}
              </span>
            ))}
            {fileSizes.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs sm:text-[11px] shrink-0 text-foreground">
                {fileSizes.map((fs, i) => (
                  <span key={`fs-${i}`} className="flex items-center">
                    <span>{fs.value} {fs.unit}</span>
                    {i < fileSizes.length - 1 && <span className="mx-0.5 text-muted-foreground/40">/</span>}
                  </span>
                ))}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}

export function GameCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/50">
      {/* 封面 */}
      <div className="w-full skeleton-shimmer" style={{ aspectRatio: "3 / 2" }} />
      {/* 内容 */}
      <div className="flex flex-col flex-1 justify-between px-3.5 pt-3 pb-4 sm:px-4 sm:pt-3.5 sm:pb-5">
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded skeleton-shimmer" />
          <div className="h-4 w-3/5 rounded skeleton-shimmer" />
        </div>
        <div className="flex gap-3.5">
          <div className="h-4 w-11 rounded skeleton-shimmer" />
          <div className="h-4 w-11 rounded skeleton-shimmer" />
          <div className="h-4 w-11 rounded skeleton-shimmer" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-14 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}