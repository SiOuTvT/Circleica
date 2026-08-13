"use client"

import { Download, Eye, Heart, ImageOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { memo, useCallback, useState, useRef, useEffect } from "react"
import { logger } from "@/lib/logger"
import { pushRecentlyViewed } from "@/lib/recently-viewed"
import { Cjk } from "@/components/cjk-text"

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

export const GameCard = memo(function GameCard({ game, showTags = true }: { game: GameCardData; showTags?: boolean }) {
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
  // 资源标签（首页卡片标签组：语言/运行方式/内容类型）：全部显示 + 按名称去重。
  // 兼容纯字符串数组（历史）与 { name, color } 数组（mapGameToCard 输出，color=首页卡片组色）。
  const seenTag = new Set<string>()
  const paramTags = (game.resourceTags ?? [])
    .map((t) => (typeof t === "string" ? { name: t, color: "" } : t))
    .filter((t) => {
      if (!t.name || seenTag.has(t.name)) return false
      seenTag.add(t.name)
      return true
    })
  const statusBadge = useStatusBadge(game.status)

  const sizes = "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"

  return (
    <Link
      href={`/games/${game.serialId ?? game.id}`}
      className="game-card group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted sm:aspect-[3/2]">
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
          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-micro font-medium text-white backdrop-blur-sm">
            {statusBadge}
          </span>
        )}

      </div>

      {/* ─── 内容区：自然撑开 ─── */}
      <div className="game-card-body flex flex-1 flex-col overflow-hidden px-2 pb-2.5 pt-2 sm:px-3.5 sm:pb-3.5 sm:pt-3">
        {/* 第1行：游戏名称 */}
        <h3 className="game-card-title text-[15px] font-semibold leading-snug line-clamp-2 min-h-[2.75em] text-foreground">
          <Cjk>{game.title}</Cjk>
        </h3>

        {/* 弹性间距：标题与标签之间 */}
        <div className="game-card-spacer" />

        {/* 第2行：标签（全部 + 去重，颜色连后台标签管理）；showTags=false 时隐藏（如继续浏览） */}
        {showTags && paramTags.length > 0 && (
          <div className="game-card-tags flex flex-shrink-0 flex-wrap items-center gap-2">
            {paramTags.map((tag, i) => (
              <span
                key={`p-${i}`}
                className="game-card-tag inline-flex min-w-0 max-w-full items-center truncate rounded-full"
                style={
                  tag.color
                    ? {
                        backgroundColor: `${tag.color}1f`,
                        color: tag.color,
                        borderColor: `${tag.color}40`,
                      }
                    : undefined
                }
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* 弹性间距：标签与统计之间 */}
        <div className="game-card-spacer" />

        {/* 第3行：数据（常驻显示，统计在最底部） */}
        <div className="game-card-stats mt-auto flex flex-shrink-0 items-center gap-3">
          {viewStr && (
            <span className="game-card-stat flex items-center gap-1 text-xs font-normal">
              <Eye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {viewStr}
            </span>
          )}
          {dlStr && (
            <span className="game-card-stat flex items-center gap-1 text-xs font-normal">
              <Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {dlStr}
            </span>
          )}
          {favStr && (
            <span className="game-card-stat flex items-center gap-1 text-xs font-normal">
              <Heart className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {favStr}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
})

export function GameCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      {/* 封面 */}
      <div className="w-full aspect-[16/10] skeleton-shimmer sm:aspect-[3/2]" />
      {/* 内容 */}
      <div className="flex flex-1 flex-col px-2 pb-2.5 pt-2 sm:px-3.5 sm:pb-3.5 sm:pt-3">
        <div className="h-[2.75em] w-full rounded skeleton-shimmer" />
        <div className="flex flex-wrap gap-2 mt-2.5">
          <div className="h-5 w-14 rounded-full skeleton-shimmer" />
          <div className="h-5 w-12 rounded-full skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

/**
 * 常驻空槽位（网格视图）—— 与 GameCard 盒模型逐像素对齐。
 *
 * 语义：「这个位置留好了，还没放东西」，区别于 GameCardSkeleton 的「内容马上到达」。
 * 因此：无 animation、无假内容条、无 hover、不进 tab 序。
 *
 * 注意事项（勿"优化"掉）：
 * 1. 根节点不带 .game-card 类 —— 否则会继承 hover:translateY 和 shadow-card，空槽会浮起来。
 * 2. 根节点不带 bg-card/ring —— 配色统一由 .game-slot 接管，.light 只需覆盖 CSS 变量。
 * 3. .game-slot 用 border 而非 ring：真卡 .game-card 的 border 影响布局，不带会差 2px。
 * 4. 直接复用 .game-card-spacer，不新建 —— 保证真卡与空槽的弹性行为永不分叉。
 */
export function GameCardSlot() {
  return (
    <div aria-hidden="true" className="game-slot flex flex-col overflow-hidden rounded-2xl">
      <div className="game-slot-cover w-full aspect-[16/10] sm:aspect-[3/2]" />
      <div className="flex flex-1 flex-col px-2 pb-2.5 pt-2 sm:px-3.5 sm:pb-3.5 sm:pt-3">
        <div className="game-slot-title" />
        <div className="game-card-spacer" />
        <div className="game-slot-tagline" />
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
  // 资源标签（首页卡片标签组）：全部显示 + 按名称去重
  const seenTag = new Set<string>()
  const paramTags = (game.resourceTags ?? [])
    .map((t) => (typeof t === "string" ? { name: t, color: "" } : t))
    .filter((t) => {
      if (!t.name || seenTag.has(t.name)) return false
      seenTag.add(t.name)
      return true
    })
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
          <span className="absolute left-1 top-1 rounded-full bg-black/55 px-1.5 py-0.5 text-micro font-medium text-white">
            {statusBadge}
          </span>
        )}
      </div>

      {/* 信息 */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-foreground">
          <Cjk>{game.title}</Cjk>
        </h3>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          {viewStr && (
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {viewStr}
            </span>
          )}
          {dlStr && (
            <span className="flex items-center gap-1">
              <Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {dlStr}
            </span>
          )}
          {favStr && (
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              {favStr}
            </span>
          )}
        </div>
        {paramTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {paramTags.map((tag, i) => (
              <span
                key={`pl-${i}`}
                className="game-card-tag inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={
                  tag.color
                    ? {
                        backgroundColor: `${tag.color}1f`,
                        color: tag.color,
                        borderColor: `${tag.color}40`,
                      }
                    : undefined
                }
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

/**
 * 常驻空槽位（列表视图）—— 与 GameListRow 盒模型逐像素对齐，行高恒为 104px。
 *
 * ⚠️ 关键差异：GameListRow 没有 .game-card 类，只有 ring-1（纯 box-shadow，不占布局）。
 * 所以 .game-list-slot 必须用 box-shadow: 0 0 0 1px 而非 border，否则 104px → 106px。
 *
 * 高度验算：信息列 = 20(标题) + 6(mt-1.5) + 16(计数) + 8(mt-2) + 18(标签) = 68px
 * < 缩略图 80px，故整行恒由缩略图决定 = p-3(12) + 80 + p-3(12) = 104px。
 */
export function GameListRowSlot() {
  return (
    <div aria-hidden="true" className="game-list-slot flex items-center gap-4 rounded-xl p-3">
      <div className="game-list-slot-thumb h-20 w-14 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="game-list-slot-title" />
        <div className="mt-1.5 game-list-slot-meta" />
        <div className="mt-2 game-slot-tagline" />
      </div>
    </div>
  )
}
