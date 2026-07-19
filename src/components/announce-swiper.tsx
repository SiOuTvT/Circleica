"use client"

import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

/** 去除 HTML 标签，返回纯文本 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

/** 相对时间 */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  const months = Math.floor(days / 30)
  return `${months}个月前`
}

interface Ann {
  id: string
  title: string
  content: string
  imageUrl: string
  link: string
  createdAt: string
  authorName: string
  authorAvatar: string
}

/** 判断是否显示 NEW 标记：最新一条 + 发布 ≤7 天 */
function shouldShowNew(announcements: Ann[], index: number): boolean {
  if (index !== 0) return false
  const created = new Date(announcements[0].createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= 7
}

export function AnnounceSwiper({ announcements, siteName = "同人游戏站" }: { announcements: Ann[]; siteName?: string }) {
  const [cur, setCur] = useState(0)
  const len = announcements.length
  const [imgError, setImgError] = useState(false)

  useEffect(() => { setImgError(false) }, [cur])
  const [paused, setPaused] = useState(false)

  const next = useCallback(() => setCur((i) => (i + 1) % len), [len])
  const prev = useCallback(() => setCur((i) => (i - 1 + len) % len), [len])

  useEffect(() => {
    if (len <= 1 || paused) return
    const t = setInterval(next, 6000)
    return () => clearInterval(t)
  }, [len, next, paused])

  if (!len) return null

  const ann = announcements[cur]
  const href = ann.link || `/announcements/${ann.id}`
  const showNew = shouldShowNew(announcements, cur)
  const summary = stripHtml(ann.content)

  return (
    <div
      className="relative w-full h-[200px] sm:h-[220px] lg:h-[310px] overflow-hidden rounded-2xl ring-1 ring-white/[0.06]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 背景图 */}
      <div className="absolute inset-0 overflow-hidden">
        {ann.imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={ann.imageUrl}
            src={ann.imageUrl}
            alt={ann.title}
            className="absolute inset-0 object-cover scale-105 lg:scale-110"
            style={{ width: "100%", height: "100%" }}
            loading={cur === 0 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={cur === 0 ? "high" : "low"}
            onError={() => setImgError(true)}
            onLoad={() => setImgError(false)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900">
            <ImageIcon className="h-12 w-12 text-white/20" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* 底部渐变遮罩 */}
      <div
        className="absolute inset-x-0 bottom-0 z-[1] h-[60%] bg-gradient-to-t from-black/60 via-black/20 to-transparent dark:from-black/70 dark:via-black/30"
      />

      {/* 内容层 */}
      <Link
        href={href}
        target={ann.link ? "_blank" : undefined}
        rel={ann.link ? "noopener noreferrer" : undefined}
        className="absolute inset-0 z-[2] flex flex-col justify-end p-2.5 sm:p-3 lg:p-3.5 cursor-pointer"
      >
        <div className="flex flex-col max-w-2xl backdrop-blur-xl bg-white/10 dark:bg-black/40 rounded-xl ring-1 ring-white/20 dark:ring-white/[0.08] shadow-lg dark:shadow-none px-3 py-2 sm:px-5 sm:py-3.5">
          {/* 发布者行 */}
          <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
            {ann.authorAvatar ? (
              <Image
                src={ann.authorAvatar}
                alt={ann.authorName || siteName}
                width={28}
                height={28}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-white/15"
                unoptimized
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white/90">
                {(ann.authorName || siteName).charAt(0)}
              </div>
            )}
            <span className="text-sm font-medium text-white/90">{ann.authorName || siteName}</span>
            <span className="text-xs text-white/50" suppressHydrationWarning>· {relativeTime(ann.createdAt)}</span>
          </div>

          {/* 标题 + NEW */}
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold leading-tight text-white line-clamp-1 transition-colors hover:text-[var(--primary)]">
              {ann.title}
            </h2>
            {showNew && (
              <Badge
                variant="default"
                size="sm"
                className="tracking-wider"
              >
                NEW
              </Badge>
            )}
          </div>

          {/* 摘要 — 单行省略（手机端隐藏节省空间） */}
          {summary && (
            <p className="hidden sm:block text-sm text-white/70 line-clamp-1 leading-relaxed mb-2.5">
              {summary}
            </p>
          )}

          {/* 查看详情（手机端隐藏） */}
          <span
            className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-white transition-all hover:underline hover:text-[var(--primary)]"
          >
            查看详情
            <span className="inline-block transition-transform hover:translate-x-1" aria-hidden="true">→</span>
          </span>
        </div>
      </Link>

      {/* 翻页按钮 */}
      {len > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev() }}
            aria-label="上一条公告"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/70 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); next() }}
            aria-label="下一条公告"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/70 backdrop-blur-sm transition-all hover:bg-black/50 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>

          {/* 分页点 */}
          <div className="absolute bottom-4 right-5 z-10 flex gap-1.5">
            {announcements.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCur(i) }}
                aria-label={`切换到第 ${i + 1} 条公告`}
                aria-current={i === cur ? "true" : undefined}
                className={`rounded-full transition-all ${i === cur ? "h-1.5 w-5 bg-white/90" : "h-1.5 w-1.5 bg-white/30 hover:bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
