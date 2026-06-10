"use client"

import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

/** 去除 HTML 标签，返回纯文本 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
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
  if (index !== 0) return false // 只有最新的一条（排序后第一条）
  const created = new Date(announcements[0].createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= 7
}

export function AnnounceSwiper({ announcements }: { announcements: Ann[] }) {
  const [cur, setCur] = useState(0)
  const len = announcements.length
  const scrollRef = useRef<HTMLDivElement>(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => { setImgError(false) }, [cur])
  const [paused, setPaused] = useState(false)

  // 监听滚动，实现视差效果
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(() => {
          const img = scrollRef.current?.querySelector("img")
          if (img) {
            img.style.transform = `translateY(${window.scrollY * 0.15}px) scale(1.1)`
          }
          ticking = false
        })
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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
  const summaryText = summary.length > 80 ? summary.slice(0, 80) + "…" : summary

  return (
    <div
      ref={scrollRef}
      className="relative w-full min-h-[220px] lg:h-[310px] overflow-hidden rounded-2xl"
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
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transform: "scale(1.1)" }}
            loading={cur === 0 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={cur === 0 ? "high" : "low"}
            onError={() => setImgError(true)}
            onLoad={() => setImgError(false)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <ImageIcon className="h-12 w-12 text-white/20" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* 底部渐变遮罩：从透明到深色 */}
      <div
        className="absolute inset-x-0 bottom-0 z-[1]"
        style={{
          height: "75%",
          background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.15) 70%, transparent 100%)",
        }}
      />

      {/* 内容层 */}
      <Link
        href={href}
        target={ann.link ? "_blank" : undefined}
        rel={ann.link ? "noopener noreferrer" : undefined}
        className="absolute inset-0 z-[2] flex flex-col justify-end p-4 sm:p-5 lg:p-6"
      >
        <div className="flex flex-col gap-1.5">
          {/* 发布者信息 */}
          {(ann.authorName || ann.authorAvatar) && (
            <div className="flex items-center gap-2">
              {ann.authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ann.authorAvatar}
                  alt={ann.authorName}
                  className="h-5 w-5 rounded-full object-cover ring-1 ring-white/20"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-white/20" />
              )}
              <span className="text-xs font-medium text-white/80">{ann.authorName}</span>
            </div>
          )}

          {/* 标题 + NEW */}
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold leading-snug text-white line-clamp-1">
              {ann.title}
            </h3>
            {showNew && (
              <span
                className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: "var(--primary, #e11d48)",
                  color: "#fff",
                  opacity: 0.85,
                }}
              >
                NEW
              </span>
            )}
          </div>

          {/* 摘要 — 单行省略 */}
          {summaryText && (
            <p className="text-sm text-white/70 line-clamp-1 leading-relaxed">
              {summaryText}
            </p>
          )}

          {/* 查看详情 CTA */}
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-white/50 transition-colors group-hover:text-white/80">
            查看详情
            <span className="inline-block transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
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
          <div className="absolute bottom-3 right-4 z-10 flex gap-1.5">
            {announcements.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCur(i) }}
                aria-label={`切换到第 ${i + 1} 条公告`}
                aria-current={i === cur ? "true" : undefined}
                className={`rounded-full transition-all ${i === cur ? "h-1.5 w-4 bg-white/90" : "h-1.5 w-1.5 bg-white/30 hover:bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}