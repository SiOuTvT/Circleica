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
  const [isLight, setIsLight] = useState(false)

  // 监听主题变化
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains("light"))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

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
    if (len <= 1) return
    const t = setInterval(next, 4500)
    return () => clearInterval(t)
  }, [len, next])

  // 切换公告时重置图片错误状态
  useEffect(() => {
    setImgError(false)
  }, [cur])

  if (!len) return null

  const ann = announcements[cur]
  const href = ann.link || `/announcements/${ann.id}`

  return (
    <div className="relative h-[215px] sm:h-[295px] lg:h-[315px] w-full lg:max-w-[66.667%] lg:ml-auto overflow-hidden rounded-2xl bg-black">
      {/* 背景图 - 始终铺满整个容器 */}
      <div className="absolute inset-0">
        {ann.imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={ann.imageUrl}
            src={ann.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-all duration-700 ease-in-out"
            style={{ transform: `scale(1.1)` }}
            onError={() => {
              console.error("[AnnounceSwiper] 图片加载失败:", ann.imageUrl)
              setImgError(true)
            }}
            onLoad={() => setImgError(false)}
          />
        ) : (
          <div className={isLight
            ? "flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300"
            : "flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900"
          }>
            <ImageIcon className={isLight ? "h-12 w-12 text-zinc-400" : "h-12 w-12 text-zinc-700"} strokeWidth={1} />
          </div>
        )}
      </div>

      {/* 内容链接（z-0，在按钮下层） */}
      <Link
        href={href}
        target={ann.link ? "_blank" : undefined}
        rel={ann.link ? "noopener noreferrer" : undefined}
        className="absolute inset-0 z-0 flex flex-col justify-end p-3 sm:p-5 lg:p-6"
      >
        <strong className="text-lg sm:text-xl lg:text-2xl font-bold leading-snug text-white line-clamp-1">
          {ann.title}
        </strong>
        <p className="mt-1.5 text-sm sm:text-base leading-relaxed text-white/80 line-clamp-2">
          {stripHtml(ann.content).slice(0, 100)}{stripHtml(ann.content).length > 100 ? "…" : ""}
        </p>
        <span className="mt-2 text-xs font-medium text-white/70">
          {ann.link ? "点击跳转 →" : "查看公告 →"}
        </span>
      </Link>

      {/* 翻页按钮（z-10，在 Link 上层） */}
      {len > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev() }}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); next() }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>

          {/* 分页点 */}
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {announcements.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setCur(i) }}
                className={`h-2 rounded-full transition-all ${i === cur ? "w-5 bg-white" : "w-2 bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
