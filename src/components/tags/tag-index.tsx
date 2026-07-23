"use client"

import { TagWithGroup } from "@/types/tags-browser"
import { BookOpen } from "lucide-react"
import Link from "next/link"
import { TagLetterNav } from "./tag-letter-nav"
import { useRef, useState, useEffect } from "react"

interface TagIndexProps {
  tagsByLetter: Record<string, TagWithGroup[]>
}

/**
 * 全部标签索引
 * 按首字母分组展示所有标签，支持滚动定位
 */
export function TagIndex({ tagsByLetter }: TagIndexProps) {
  const [activeLetter, setActiveLetter] = useState<string>("")
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const letters = Object.keys(tagsByLetter).sort()

  // 滚动监听 - 更新当前高亮的字母
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const letter = entry.target.getAttribute("data-letter")
            if (letter) {
              setActiveLetter(letter)
            }
          }
        })
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    )

    letters.forEach((letter) => {
      const el = sectionRefs.current[letter]
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [letters])

  const handleLetterClick = (letter: string) => {
    const el = sectionRefs.current[letter]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="bg-card rounded-2xl ring-1 ring-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-5 w-5" strokeWidth={2} /> 全部标签
        </h2>
      </div>

      {/* 字母索引导航（粘性定位） */}
      <TagLetterNav
        letters={letters}
        activeLetter={activeLetter}
        onLetterClick={handleLetterClick}
      />

      {/* 标签列表 */}
      <div className="max-h-[600px] overflow-y-auto p-6">
        {letters.map((letter) => {
          const tags = tagsByLetter[letter]
          if (!tags || tags.length === 0) return null

          return (
            <div
              key={letter}
              ref={(el) => { sectionRefs.current[letter] = el }}
              data-letter={letter}
              className="mb-6 last:mb-0"
            >
              <div className="sticky top-0 bg-card pb-2 mb-3 border-b border-border">
                <span className="text-sm font-bold text-foreground">
                  {letter === "0-9" ? "#" : letter}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {tags.length} 个标签
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/search?tag=${encodeURIComponent(tag.name)}`}
                    className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:scale-105 hover:shadow-1"
                    style={{
                      backgroundColor: `${tag.color || tag.group.color}18`,
                      color: tag.color || tag.group.color,
                      border: `1px solid ${tag.color || tag.group.color}30`,
                    }}
                    title={`${tag.group.name} · ${tag.gameCount} 个游戏`}
                  >
                    {tag.name}
                    <span className="ml-1.5 text-micro opacity-60">
                      {tag.gameCount}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}

        {letters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">暂无标签</p>
          </div>
        )}
      </div>
    </div>
  )
}