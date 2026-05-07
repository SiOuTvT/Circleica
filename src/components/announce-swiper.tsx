"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

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
  const [scrollY, setScrollY] = useState(0)

  // 监听滚动，实现视差效果
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
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

  if (!len) return null

  const ann = announcements[cur]
  const href = ann.link || `/announcements/${ann.id}`

  return (
    <div className="relative h-[180px] sm:h-[200px] lg:h-[220px] w-full overflow-hidden rounded-2xl">
      {/* 背景图 - 视差滚动效果 */}
      <div className="absolute inset-0 bg-zinc-900">
        {ann.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ann.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-all duration-700 ease-in-out"
            style={{ transform: `translateY(${scrollY * 0.3}px) scale(1.1)` }}
          />
        )}
      </div>
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/30 to-transparent" />
      {ann.imageUrl && <div className="absolute inset-0 bg-zinc-950/40" />}

      {/* 内容链接（z-0，在按钮下层） */}
      <Link
        href={href}
        target={ann.link ? "_blank" : undefined}
        rel={ann.link ? "noopener noreferrer" : undefined}
        className="absolute inset-0 z-0 flex flex-col justify-end p-5 sm:p-6"
      >
        <strong className="text-base sm:text-lg font-bold leading-snug text-white line-clamp-1">
          {ann.title}
        </strong>
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-white/80 line-clamp-2">
          {ann.content.slice(0, 100)}{ann.content.length > 100 ? "…" : ""}
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
