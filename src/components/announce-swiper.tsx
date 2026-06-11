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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => { setImgError(false) }, [cur])
  const [paused, setPaused] = useState(false)

  // 视差滚动
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

  return (
    <div
      ref={scrollRef}
      className="relative w-full min-h-[220px] lg:h-[320px] overflow-hidden rounded-2xl ring-1 ring-white/[0.06]"
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
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700"
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

      {/* 底部渐变遮罩 */}
      <div
        className="absolute inset-x-0 bottom-0 z-[1]"
        style={{
          height: "80%",
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.2) 65%, transparent 100%)",
        }}
      />

      {/* 内容层 */}
      <Link
        href={href}
        target={ann.link ? "_blank" : undefined}
        rel={ann.link ? "noopener noreferrer" : undefined}
        className="group absolute inset-0 z-[2] flex flex-col justify-end p-5 sm:p-6 lg:p-8"
      >
        <div className="flex flex-col gap-2 max-w-2xl">
          {/* 发布者信息 */}
          <div className="flex items-center gap-2">
            {ann.authorAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ann.authorAvatar}
                alt={ann.authorName || siteName}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-white/20"
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white/80">
                {(ann.authorName || siteName).charAt(0)}
              </div>
            )}
            <span className="text-xs font-medium text-white/70">{ann.authorName || siteName}</span>
          </div>

          {/* 标题 + NEW */}
          <div className="flex items-center gap-2.5">
            <h3 className="text-xl sm:text-2xl lg:text-[28px] font-bold leading-tight text-white line-clamp-1 drop-shadow-sm">
              {ann.title}
            </h3>
            {showNew && (
              <span
                className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider"
                style={{
                  background: "var(--primary, #e11d48)",
                  color: "#fff",
                  opacity: 0.9,
                }}
              >
                NEW
              </span>
            )}
          </div>

          {/* 摘要 — 单行省略 */}
          {summary && (
            <p className="text-sm text-white/60 line-clamp-1 leading-relaxed">
              {summary}
            </p>
          )}

          {/* 查看详情 */}
          <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-white/40 transition-colors group-hover:text-white/70">
            查看详情
            <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
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
