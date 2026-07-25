"use client"

import { Download, Eye, Heart, ImageOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Tag, TagGroup } from "@/components/ui/tag"
import { memo, useCallback, useState, useRef, useEffect } from "react"
import { logger } from "@/lib/logger"
import { pushRecentlyViewed } from "@/lib/recently-viewed"

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

/** 连载状态角标 */
function useStatusBadge(status: string): string | null {
  if (status === "ongoing") return "连载中"
  if (status === "completed") return "已完结"
  if (status === "hiatus") return "休刊"
  return null
}

export const GameCard = memo(function GameCard({ game }: { game: GameCardData }) {
  const [imgError, setImgError] = useState(false)
  const [imgFallback, setImgFallback] = useState(false)

  const handleNextImageError = useCallback(() => {
    setImgFallback(true)
  }, [])
  const handleImgError = useCallback(() => {
    setImgError(true)
  }, [])

  const coverSrc = game.coverImage
  const prevSrcRef = useRef(coverSrc)
  useEffect(() => {
    if (coverSrc !== prevSrcRef.current) {
      prevSrcRef.current = coverSrc
      setImgError(false)
      setImgFallback(false)
    }
  }, [coverSrc])

  const viewStr = fmtNum(game.viewCount)
  const dlStr = fmtNum(game.downloadCount)
  const favStr = fmtNum(game.favoriteCount)
  const rawTags = game.resourceTags ?? []
  const paramTags = rawTags.map((t) => (typeof t === "string" ? { name: t, color: "" } : t))
  const statusBadge = useStatusBadge(game.status)

  const sizes = "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"

  return (
    <Link
      href={`/games/${game.serialId ?? game.id}`}
      className="game-card group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => {
        try {
          sessionStorage.setItem(`pending_view_${game.id}`, "1")
          pushRecentlyViewed({
            id: game.id,
            serialId: game.serialId,
            title: game.title,
            coverImage: game.coverImage,
            status: game.status,
            isNsfw: game.isNsfw,
            favoriteCount: game.favoriteCount,
            viewCount: game.viewCount,
            downloadCount: game.downloadCount,
            resourceTags: game.resourceTags,
            updatedAt: game.updatedAt,
            createdAt: game.createdAt,
            tags: game.tags,
          })
        } catch (err) {
          logger.api.warn("[GameCard] set sessionStorage failed", { error: err instanceof Error ? err.message : String(err) })
        }
      }}
    >
      {/* ─── 封面：竖图比例更舒展（3:4 倾向） ─── */}
      <div className="relative w-full aspect-[3/4] overflow-hidden bg-muted sm:aspect-[4/5]">
        {game.coverImage && !imgError ? (
          imgFallback ? (
            // 降级：原生 img 绕过 next/image 优化管道
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={game.coverImage}
              alt={game.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
              decoding="async"
              onError={handleImgError}
            />
          ) : (
            <Image
              src={game.coverImage}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              sizes={sizes}
              onError={handleNextImageError}
              loading={game.serialId != null && game.serialId <= 4 ? "eager" : "lazy"}
              decoding="async"
              quality={75}
              priority={game.serialId != null && game.serialId <= 4}
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground/30">
            <ImageOff className="h-8 w-8" aria-hidden="true" strokeWidth={1} />
          </div>
        )}

        {/* 状态角标 */}
        {statusBadge && (
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {statusBadge}
          </span>
        )}

        {/* hover 浮现的元信息（计数）—— 默认不显示，减少堆叠 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-3 py-2.5 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {viewStr && (
            <span className="flex items-center gap-1 text-xs font-medium">
              <Eye className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {viewStr}
            </span>
          )}
          {dlStr && (
            <span className="flex items-center gap-1 text-xs font-medium">
              <Download className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {dlStr}
            </span>
          )}
          {favStr && (
            <span className="flex items-center gap-1 text-xs font-medium">
              <Heart className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {favStr}
            </span>
          )}
        </div>
      </div>

      {/* ─── 内容区：标题 + 资源标签（信息收敛） ─── */}
      <div className="flex flex-1 flex-col px-2.5 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
        <h3 className="game-card-title text-[15px] font-semibold leading-snug line-clamp-2 text-foreground">
          {game.title}
        </h3>

        <div className="game-card-spacer" />

        {paramTags.length > 0 && (
          <TagGroup className="game-card-tags flex-shrink-0">
            {paramTags.slice(0, 3).map((tag, i) => (
              <Tag key={`p-${i}`} color={tag.color || undefined}>
                {tag.name}
              </Tag>
            ))}
          </TagGroup>
        )}
      </div>
    </Link>
  )
})

export function GameCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      {/* 封面 */}
      <div className="w-full aspect-[3/4] skeleton-shimmer sm:aspect-[4/5]" />
      {/* 内容 */}
      <div className="flex flex-1 flex-col px-2.5 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
        <div className="h-4 w-full rounded skeleton-shimmer" />
        <div className="flex flex-wrap gap-2 mt-2.5">
          <div className="h-5 w-14 rounded-full skeleton-shimmer" />
          <div className="h-5 w-12 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

/** 列表视图的行布局（配合 ResultToolbar 的视图切换使用） */
export const GameListRow = memo(function GameListRow({ game }: { game: GameCardData }) {
  const [imgError, setImgError] = useState(false)
  const [imgFallback, setImgFallback] = useState(false)

  const handleNextImageError = useCallback(() => setImgFallback(true), [])
  const handleImgError = useCallback(() => setImgError(true), [])

  const coverSrc = game.coverImage
  const prevSrcRef = useRef(coverSrc)
  useEffect(() => {
    if (coverSrc !== prevSrcRef.current) {
      prevSrcRef.current = coverSrc
      setImgError(false)
      setImgFallback(false)
    }
  }, [coverSrc])

  const viewStr = fmtNum(game.viewCount)
  const dlStr = fmtNum(game.downloadCount)
  const favStr = fmtNum(game.favoriteCount)
  const rawTags = game.resourceTags ?? []
  const paramTags = rawTags.map((t) => (typeof t === "string" ? { name: t, color: "" } : t))
  const statusBadge = useStatusBadge(game.status)

  return (
    <Link
      href={`/games/${game.serialId ?? game.id}`}
      className="group flex items-center gap-4 rounded-xl bg-card p-3 ring-1 ring-border transition-all hover:ring-foreground/10"
      onClick={() => {
        try {
          sessionStorage.setItem(`pending_view_${game.id}`, "1")
          pushRecentlyViewed({
            id: game.id,
            serialId: game.serialId,
            title: game.title,
            coverImage: game.coverImage,
            status: game.status,
            isNsfw: game.isNsfw,
            favoriteCount: game.favoriteCount,
            viewCount: game.viewCount,
            downloadCount: game.downloadCount,
            resourceTags: game.resourceTags,
            updatedAt: game.updatedAt,
            createdAt: game.createdAt,
            tags: game.tags,
          })
        } catch (err) {
          logger.api.warn("[GameListRow] set sessionStorage failed", { error: err instanceof Error ? err.message : String(err) })
        }
      }}
    >
      {/* 缩略封面 + 状态角标 */}
      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {game.coverImage && !imgError ? (
          imgFallback ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={game.coverImage}
              alt={game.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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
              sizes="56px"
              onError={handleNextImageError}
              loading="lazy"
              decoding="async"
              quality={70}
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground/30">
            <ImageOff className="h-6 w-6" aria-hidden="true" strokeWidth={1} />
          </div>
        )}
        {statusBadge && (
          <span className="absolute left-1 top-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white">
            {statusBadge}
          </span>
        )}
      </div>

      {/* 信息 */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-foreground">
          {game.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          {viewStr && (
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {viewStr}
            </span>
          )}
          {dlStr && (
            <span className="flex items-center gap-1">
              <Download className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {dlStr}
            </span>
          )}
          {favStr && (
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              {favStr}
            </span>
          )}
        </div>
        {paramTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {paramTags.slice(0, 4).map((tag, i) => (
              <Tag key={`pl-${i}`} color={tag.color || undefined}>
                {tag.name}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
})

export function GameListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-card p-3 ring-1 ring-border">
      <div className="h-20 w-14 shrink-0 rounded-lg skeleton-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded skeleton-shimmer" />
        <div className="flex gap-3">
          <div className="h-3.5 w-11 rounded skeleton-shimmer" />
          <div className="h-3.5 w-11 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}
