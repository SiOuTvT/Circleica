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
}

export function AnnounceSwiper({ announcements }: { announcements: Ann[] }) {
  const [cur, setCur] = useState(0)
  const len = announcements.length
  const scrollRef = useRef<HTMLDivElement>(null)
  const [imgError, setImgError] = useState(false)
   
  useEffect(() => { setImgError(false) }, [cur])
  const [paused, setPaused] = useState(false)

  // 监听滚动，实现视差效果（用 ref + rAF 避免高频 setState）
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(() => {
          const img = scrollRef.current?.querySelector('img')
          if (img) {
            img.style.transform = `translateY(${window.scrollY * 0.15}px) scale(1.1)`
          }
          ticking = false
        })
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
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

  return (
    <div
      className="relative h-[220px] sm:h-[300px] lg:h-[330px] w-full sm:max-w-[60%] sm:ml-auto overflow-hidden rounded-2xl bg-zinc-900 light:bg-zinc-100"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 背景图 - 始终铺满整个容器 */}
      <div className="absolute inset-0 overflow-hidden">
        {ann.imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={ann.imageUrl}
            src={ann.imageUrl}
            alt={ann.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-in-out"
            style={{ transform: `scale(1.1)` }}
            loading={cur === 0 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={cur === 0 ? "high" : "low"}
            onError={() => {
              setImgError(true)
            }}
            onLoad={() => setImgError(false)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 light:from-zinc-200 light:to-zinc-300">
            <ImageIcon className="h-12 w-12 text-zinc-700 light:text-zinc-400" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* 内容链接（z-0，在按钮下层）— 纯文字，无遮罩 */}
      <Link
        href={href}
        target={ann.link ? "_blank" : undefined}
        rel={ann.link ? "noopener noreferrer" : undefined}
        className="absolute inset-0 z-0 flex flex-col justify-end p-3 sm:p-5 lg:p-6"
      >
        <strong className="text-lg sm:text-xl lg:text-2xl font-bold leading-snug text-white line-clamp-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
          {ann.title}
        </strong>
        <p className="mt-1.5 text-sm sm:text-base leading-relaxed text-white line-clamp-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          {stripHtml(ann.content).slice(0, 100)}{stripHtml(ann.content).length > 100 ? "…" : ""}
        </p>
      </Link>

      {/* 翻页按钮（z-10，在 Link 上层） */}
      {len > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev() }}
            aria-label="上一条公告"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); next() }}
            aria-label="下一条公告"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </button>

          {/* 分页点 */}
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-4 sm:gap-2">
            {announcements.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setCur(i) }}
                aria-label={`切换到第 ${i + 1} 条公告`}
                aria-current={i === cur ? "true" : undefined}
                className={`h-2 w-2 rounded-full transition-all sm:h-2.5 sm:w-2.5 ${i === cur ? "!w-4 sm:!w-5 lg:!w-6 bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}