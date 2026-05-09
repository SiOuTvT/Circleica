"use client"

import { Eye, Heart, ImageOff } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export interface GameCardData {
  id: string
  title: string
  coverImage: string
  description?: string
  tags: { name: string; color: string }[]
  favoriteCount: number
  viewCount?: number
  isNsfw: boolean
  status: string
  createdAt?: Date | string
}

export function GameCard({ game }: { game: GameCardData }) {
  const router = useRouter()
  const [showPreview, setShowPreview] = useState(false)
  const [previewPos, setPreviewPos]   = useState<"left" | "right">("right")
  const [imgError, setImgError]       = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleMouseEnter() {
    timerRef.current = setTimeout(() => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        setPreviewPos(rect.left > window.innerWidth / 2 ? "left" : "right")
      }
      setShowPreview(true)
    }, 250)
  }

  function handleMouseLeave(e: React.MouseEvent) {
    if (timerRef.current) clearTimeout(timerRef.current)
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (relatedTarget && cardRef.current?.contains(relatedTarget)) {
      return
    }
    setShowPreview(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      ref={cardRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={`/games/${game.id}`}
        className="group relative block overflow-hidden rounded-[14px] card-spring"
      >
        {/* 内发光边框层 */}
        <div className="absolute inset-0 rounded-[14px] pointer-events-none z-10"
          style={{
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)',
          }} 
        />
        
        {/* 背景层 */}
        <div className="absolute inset-0 bg-card rounded-[14px]" />
        
        {/* 投影层 */}
        <div className="absolute inset-0 rounded-[14px] transition-all duration-300 group-hover:shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.15),0_16px_32px_rgba(0,0,0,0.2)]"
          style={{
            boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)',
          }}
        />
        
        {/* 封面区（固定高度） */}
        <div className="relative w-full overflow-hidden bg-muted" style={{ paddingBottom: "60%" }}>
          {game.coverImage && !imgError ? (
            <Image
              src={game.coverImage}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setImgError(true)}
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <ImageOff className="w-8 h-8" strokeWidth={1} />
            </div>
          )}

          {game.isNsfw && (
            <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[8px] transition-opacity duration-300 group-hover:opacity-0" />
          )}
        </div>

        {/* 信息条（自适应高度） - 手机端和桌面端显示相同内容 */}
        <div className="flex flex-col gap-1.5 sm:gap-2 bg-card px-2 sm:px-3 py-2 sm:py-2.5">
          <p className="line-clamp-2 text-[13px] sm:text-[15px] font-bold leading-snug text-card-foreground">{game.title}</p>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {game.tags.slice(0, 2).map((tag) => (
              <span key={tag.name} className="rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-pink-400 bg-pink-400/10 ring-1 ring-pink-400/20">
                {tag.name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-[12px] text-muted-foreground">
              <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} />{game.viewCount ?? 0}
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-[12px] text-muted-foreground">
              <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} />{game.favoriteCount}
            </span>
          </div>
        </div>
      </Link>

      {/* Hover 预览弹窗 - 仅桌面端显示 */}
      {showPreview && (
        <div
          onMouseEnter={() => {
            if (timerRef.current) clearTimeout(timerRef.current)
          }}
          onMouseLeave={() => {
            setShowPreview(false)
          }}
          className={[
            "absolute top-0 z-50 w-64 overflow-hidden rounded-2xl bg-popover/98 backdrop-blur-xl modal-enter hidden lg:block",
            previewPos === "right" ? "left-[calc(100%+12px)]" : "right-[calc(100%+12px)]",
          ].join(" ")}
          style={{
            boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {game.coverImage && (
            <div className="relative h-32 w-full overflow-hidden">
              <Image src={game.coverImage} alt={game.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-popover/80 to-transparent" />
            </div>
          )}

          <div className="p-3 space-y-2">
            <p className="text-lg font-bold text-popover-foreground leading-snug">{game.title}</p>

            {game.description && (
              <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-3">{game.description}</p>
            )}

            {game.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {game.tags.map((tag) => (
                  <button
                    key={tag.name}
                    className="pointer-events-auto rounded-full px-2.5 py-0.5 text-[12px] font-medium text-pink-400 bg-pink-400/10 ring-1 ring-pink-400/20 transition-opacity hover:opacity-70"
                    onClick={(e) => { e.preventDefault(); router.push(`/search?tag=${encodeURIComponent(tag.name)}`) }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1.5 divider-subtle">
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <Eye className="h-3.5 w-3.5" strokeWidth={2} />{game.viewCount ?? 0}
              </span>
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <Heart className="h-3.5 w-3.5" strokeWidth={2} />{game.favoriteCount}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function GameCardSkeleton() {
  return (
        <div className="overflow-hidden rounded-[14px] bg-card">
      {/* 封面区域 */}
      <div className="w-full skeleton-shimmer" style={{ paddingBottom: "60%" }} />
      
      {/* 信息区域 - 形状匹配真实内容 */}
      <div className="bg-card px-2.5 py-2 space-y-2">
        {/* 标题 - 两行 */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded skeleton-shimmer" />
          <div className="h-3 w-4/5 rounded skeleton-shimmer" />
        </div>
        
        {/* 标签 - 两个小圆角 */}
        <div className="flex gap-1">
          <div className="h-2.5 w-12 rounded-full skeleton-shimmer" />
          <div className="h-2.5 w-10 rounded-full skeleton-shimmer" />
        </div>
        
        {/* 统计数据 - 图标+数字 */}
        <div className="flex gap-3 pt-0.5">
          <div className="h-2.5 w-8 rounded skeleton-shimmer" />
          <div className="h-2.5 w-8 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}
