"use client"

import { parseFileSizes, parseStringArray } from "@/lib/parse-utils"
import { Download, Eye, Heart, ImageOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useState } from "react"

export interface GameCardData {
  id: string
  serialId?: number | null
  title: string
  coverImage: string
  tags: { name: string; color: string }[]
  favoriteCount: number
  viewCount?: number
  downloadCount?: number
  platform?: string
  downloadLinks?: { label?: string; url: string; platform?: string }[]
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
  const [imgFallback, setImgFallback] = useState(false)

  const handleNextImageError = useCallback(() => {
    // next/image 加载失败，尝试原生 img 降级
    setImgFallback(true)
  }, [])

  const handleImgError = useCallback(() => {
    // 原生 img 也失败，显示占位图
    setImgError(true)
  }, [])

  // src 变化时重置
  const coverSrc = game.coverImage
  const [prevSrc, setPrevSrc] = useState(coverSrc)
  if (coverSrc !== prevSrc) {
    setPrevSrc(coverSrc)
    setImgError(false)
    setImgFallback(false)
  }

  const viewStr = fmtNum(game.viewCount)
  const dlStr = fmtNum(game.downloadCount)
  const favStr = fmtNum(game.favoriteCount)

  // 优先从 downloadLinks 中提取平台标签（去重），回退到 game.platform
  const platformTags = (() => {
    if (game.downloadLinks && game.downloadLinks.length > 0) {
      const platforms = game.downloadLinks
        .map((dl) => dl.platform)
        .filter((p): p is string => !!p)
      const unique = [...new Set(platforms)]
      if (unique.length > 0) return unique
    }
    return parseStringArray(game.platform)
  })()
  const languageTags = parseStringArray(game.language)
  const paramTags = [...platformTags, ...languageTags]
  const fileSizes = parseFileSizes(game.fileSize)

  return (
    <Link
      href={`/games/${game.serialId ?? game.id}`}
      aria-label={`查看游戏：${game.title}`}
      className="game-card group flex flex-col overflow-hidden rounded-2xl transition-all duration-300"
      onClick={() => {
        try { sessionStorage.setItem(`pending_view_${game.id}`, "1") } catch {}
      }}
    >
      {/* ─── 封面：比例固定 ─── */}
      <div className="relative w-full" style={{ aspectRatio: "3 / 2" }}>
        {game.coverImage && !imgError ? (
          imgFallback ? (
            // 降级：原生 img 绕过 next/image 优化管道
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={game.coverImage}
              alt={game.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
              onError={handleImgError}
            />
          ) : (
            <Image
              src={game.coverImage}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={handleNextImageError}
              loading="lazy"
              decoding="async"
              quality={75}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEzMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJiIj48Z2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMTIiLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjYikiIGZpbGw9IiMyMjIiLz48L3N2Zz4="
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground/30">
            <ImageOff className="w-8 h-8" aria-hidden="true" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* ─── 内容区 ─── */}
      <div className="game-card-body flex flex-col flex-1 px-3 pt-2.5 pb-3.5 sm:px-4 sm:pt-3 sm:pb-4">
        {/* 第1行：游戏名称 */}
        <h3 className="game-card-title text-[15px] sm:text-base font-semibold leading-snug line-clamp-2">
          {game.title}
        </h3>

        {/* 弹性间距：保证 title 和 stats 之间至少 10px */}
        <div className="game-card-spacer" />

        {/* 第2行：数据 */}
        <div className="game-card-stats flex items-center gap-3 flex-shrink-0">
          {viewStr && (
            <span className="game-card-stat flex items-center gap-1 text-sm sm:text-[13px] font-normal">
              <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" strokeWidth={1.5} aria-hidden="true" />
              {viewStr}
            </span>
          )}
          {dlStr && (
            <span className="game-card-stat flex items-center gap-1 text-sm sm:text-[13px] font-normal">
              <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" strokeWidth={1.5} aria-hidden="true" />
              {dlStr}
            </span>
          )}
          {favStr && (
            <span className="game-card-stat flex items-center gap-1 text-sm sm:text-[13px] font-normal">
              <Heart className="w-4 h-4 sm:w-3.5 sm:h-3.5" strokeWidth={1.5} aria-hidden="true" />
              {favStr}
            </span>
          )}
        </div>

        {/* 弹性间距：保证 stats 和 tags 之间也至少 10px */}
        <div className="game-card-spacer" />

        {/* 第3行：标签 */}
        {(paramTags.length > 0 || fileSizes.length > 0) && (
          <div className="game-card-tags flex flex-wrap items-center gap-2 flex-shrink-0">
            {paramTags.map((tag, i) => (
              <span
                key={`p-${i}`}
                className="game-card-tag inline-flex items-center rounded-md px-2.5 py-1 text-xs sm:text-[11px] font-medium shrink-0"
              >
                {tag}
              </span>
            ))}
            {fileSizes.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs sm:text-[11px] shrink-0 text-muted-foreground">
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
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card card-shadow">
      {/* 封面 */}
      <div className="w-full skeleton-shimmer" style={{ aspectRatio: "3 / 2" }} />
      {/* 内容 */}
      <div className="flex flex-col flex-1 px-2 pt-2 pb-3 sm:px-4 sm:pt-3 sm:pb-4">
        <div className="h-4 w-full rounded skeleton-shimmer" />
        <div className="game-card-spacer" />
        <div className="flex gap-3">
          <div className="h-3.5 w-11 rounded skeleton-shimmer" />
          <div className="h-3.5 w-11 rounded skeleton-shimmer" />
          <div className="h-3.5 w-11 rounded skeleton-shimmer" />
        </div>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <div className="h-5 w-16 rounded-full skeleton-shimmer" />
          <div className="h-5 w-14 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}