"use client"

import { Download, Eye, Heart, ImageOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { memo, useCallback, useState } from "react"

export interface GameCardData {
  id: string
  serialId?: number | null
  title: string
  coverImage: string
  tags: { name: string; color: string }[]
  favoriteCount: number
  viewCount?: number
  downloadCount?: number
  downloadLinks?: { label?: string; url: string; tags?: string[] }[]
  resourceTags?: string[] | { name: string; color: string }[]
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

export const GameCard = memo(function GameCard({ game }: { game: GameCardData }) {
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

  // 使用 resourceTags（来自资源表的 language/runType/resourceContent 去重合并）
  const rawTags = game.resourceTags ?? []
  // 兼容旧格式 string[] 和新格式 {name, color}[]
  const paramTags = rawTags.map(t => typeof t === "string" ? { name: t, color: "" } : t)

  return (
    <Link
      href={`/games/${game.serialId ?? game.id}`}
      aria-label={`查看游戏：${game.title}`}
      className="game-card group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => {
        try { sessionStorage.setItem(`pending_view_${game.id}`, "1") } catch {}
      }}
    >
      {/* ─── 封面：固定像素高度 ─── */}
      <div className="relative w-full h-[130px] sm:h-[155px] lg:h-[175px]">
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

      {/* ─── 内容区：自然撑开 ─── */}
      <div className="game-card-body flex flex-col flex-1 px-3 pt-2.5 pb-3.5 sm:px-4 sm:pt-3 sm:pb-4 overflow-hidden">
        {/* 第1行：游戏名称 */}
        <h3 className="game-card-title text-base font-semibold leading-snug line-clamp-2">
          {game.title}
        </h3>

        {/* 弹性间距：保证 title 和 stats 之间至少 10px */}
        <div className="game-card-spacer" />

        {/* 第2行：数据 */}
        <div className="game-card-stats flex items-center gap-3 flex-shrink-0">
          {viewStr && (
            <span className="game-card-stat flex items-center gap-1 text-xs font-normal">
              <Eye className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              {viewStr}
            </span>
          )}
          {dlStr && (
            <span className="game-card-stat flex items-center gap-1 text-xs font-normal">
              <Download className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              {dlStr}
            </span>
          )}
          {favStr && (
            <span className="game-card-stat flex items-center gap-1 text-xs font-normal">
              <Heart className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              {favStr}
            </span>
          )}
        </div>

        {/* 弹性间距：保证 stats 和 tags 之间也至少 10px */}
        <div className="game-card-spacer" />

        {/* 第3行：标签 */}
        {paramTags.length > 0 && (
          <div className="game-card-tags flex flex-wrap items-center gap-1.5 flex-shrink-0">
            {paramTags.map((tag, i) => (
              <span
                key={`p-${i}`}
                className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium shrink-0"
                style={{
                  background: tag.color ? `${tag.color}18` : undefined,
                  color: tag.color || undefined,
                  border: tag.color ? `1px solid ${tag.color}30` : undefined,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
})

export function GameCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card card-shadow">
      {/* 封面 */}
      <div className="w-full h-[130px] sm:h-[155px] lg:h-[175px] skeleton-shimmer" />
      {/* 内容 */}
      <div className="flex flex-col flex-1 px-3 pt-2.5 pb-3.5 sm:px-4 sm:pt-3 sm:pb-4">
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