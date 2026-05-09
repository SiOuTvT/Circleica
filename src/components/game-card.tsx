"use client"

import { Eye, Heart } from "lucide-react"
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

const STATUS_CLS: Record<string, string> = {
  完结:   "bg-emerald-500/15 text-emerald-400",
  连载中: "bg-sky-500/15 text-sky-400",
  已弃坑: "bg-red-500/15 text-red-400",
}

function isNew(createdAt?: Date | string) {
  if (!createdAt) return false
  return Date.now() - new Date(createdAt).getTime() < 7 * 86400_000
}

export function GameCard({ game }: { game: GameCardData }) {
  const router = useRouter()
  const [showPreview, setShowPreview] = useState(false)
  const [previewPos, setPreviewPos]   = useState<"left" | "right">("right")
  const cardRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleMouseEnter() {
    timerRef.current = setTimeout(() => {
      // 判断卡片在屏幕左半还是右半，决定预览弹窗方向
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        setPreviewPos(rect.left > window.innerWidth / 2 ? "left" : "right")
      }
      setShowPreview(true)
    }, 250) // 降低到 250ms，更快响应
  }

  function handleMouseLeave(e: React.MouseEvent) {
    if (timerRef.current) clearTimeout(timerRef.current)
    // 检查鼠标是否移到了预览弹窗上（relatedTarget 是鼠标移到的元素）
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (relatedTarget && cardRef.current?.contains(relatedTarget)) {
      return // 鼠标还在卡片/预览区域内，不隐藏
    }
    setShowPreview(false)
  }

  // 组件卸载时清理定时器，防止内存泄漏
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
        style={{ aspectRatio: "5/6" }}
      >
        {/* 内发光边框层 */}
        <div className="absolute inset-0 rounded-[14px] pointer-events-none z-10"
          style={{
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)',
          }} 
        />
        
        {/* 背景层 */}
        <div className="absolute inset-0 bg-card rounded-[14px]" />
        
        {/* 投影层 - 多层阴影创造深度 */}
        <div className="absolute inset-0 rounded-[14px] transition-all duration-300 group-hover:shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.15),0_16px_32px_rgba(0,0,0,0.2)]"
          style={{
            boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1)',
          }}
        />
        
        {/* 封面区（上方 60%） */}
        <div className="absolute inset-0 bottom-[40%] overflow-hidden bg-muted">
          {game.coverImage ? (
            <Image
              src={game.coverImage}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.06]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">暂无封面</div>
          )}

          {game.isNsfw && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/65 backdrop-blur-[6px] transition-opacity duration-300 group-hover:opacity-0">
              <span className="rounded border border-red-500/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">NSFW</span>
            </div>
          )}
          {isNew(game.createdAt) && (
            <span className="absolute left-2 top-2 gradient-accent rounded px-2 py-0.5 text-[11px] font-bold text-white">NEW</span>
          )}
          <span className={`absolute right-2 top-2 rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[game.status] ?? "bg-zinc-800/80 text-zinc-400"}`}>
            {game.status}
          </span>
        </div>

        {/* 信息条（下方 40%） */}
        <div className="absolute inset-x-0 bottom-0 flex h-[40%] flex-col justify-center gap-2 bg-card px-3 py-2.5">
          <p className="line-clamp-2 text-[15px] font-bold leading-snug text-card-foreground">{game.title}</p>
          <div className="flex flex-wrap gap-1.5">
            {game.tags.slice(0, 2).map((tag) => (
              <span key={tag.name} className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ color: tag.color, background: `${tag.color}18`, boxShadow: `0 0 0 1px ${tag.color}20` }}>
                {tag.name}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <Eye className="h-3.5 w-3.5" strokeWidth={2} />{game.viewCount ?? 0}
            </span>
            <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <Heart className="h-3.5 w-3.5" strokeWidth={2} />{game.favoriteCount}
            </span>
          </div>
        </div>
      </Link>

      {/* Hover 预览弹窗 - 增强视觉效果 */}
      {showPreview && (
        <div
          onMouseEnter={() => {
            // 鼠标进入预览弹窗时，取消隐藏定时器
            if (timerRef.current) clearTimeout(timerRef.current)
          }}
          onMouseLeave={() => {
            // 鼠标离开预览弹窗时，隐藏预览
            setShowPreview(false)
          }}
          className={[
            "absolute top-0 z-50 w-64 overflow-hidden rounded-2xl bg-popover/98 backdrop-blur-xl modal-enter",
            previewPos === "right" ? "left-[calc(100%+12px)]" : "right-[calc(100%+12px)]",
          ].join(" ")}
          style={{
            boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* 封面 */}
          {game.coverImage && (
            <div className="relative h-32 w-full overflow-hidden">
              <Image src={game.coverImage} alt={game.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-popover/80 to-transparent" />
            </div>
          )}

          <div className="p-3 space-y-2">
            <p className="text-lg font-bold text-popover-foreground leading-snug">{game.title}</p>

            {/* 简介 */}
            {game.description && (
              <p className="text-[13px] leading-relaxed text-muted-foreground line-clamp-3">{game.description}</p>
            )}

            {/* 标签（可点击） */}
            {game.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {game.tags.map((tag) => (
                  <button
                    key={tag.name}
                    className="pointer-events-auto rounded-full px-2.5 py-0.5 text-[12px] font-medium transition-opacity hover:opacity-70"
                    style={{ color: tag.color, background: `${tag.color}20`, boxShadow: `0 0 0 1px ${tag.color}20` }}
                    onClick={(e) => { e.preventDefault(); router.push(`/search?tag=${encodeURIComponent(tag.name)}`) }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}

            {/* 数据 */}
            <div className="flex items-center gap-3 pt-1.5 divider-subtle">
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <Eye className="h-3.5 w-3.5" strokeWidth={2} />{game.viewCount ?? 0}
              </span>
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <Heart className="h-3.5 w-3.5" strokeWidth={2} />{game.favoriteCount}
              </span>
              <span className={`ml-auto rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_CLS[game.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                {game.status}
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
    <div className="overflow-hidden rounded-[14px] bg-card" style={{ aspectRatio: "5/6" }}>
      {/* 封面区域 */}
      <div className="h-[60%] w-full skeleton-shimmer" />
      
      {/* 信息区域 - 形状匹配真实内容 */}
      <div className="h-[40%] bg-card px-2.5 py-2 space-y-2">
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
