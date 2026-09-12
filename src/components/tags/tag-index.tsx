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
 * 整块「全部标签」默认只铺前 24 个（跨字母累计）。
 * 之前按「每字母组前 12」截断对中文/日文标签无效——每桶只有 1-5 个，永远不触发。
 */
const BLOCK_BUDGET = 24

/**
 * 全部标签索引
 * 按首字母分组展示所有标签，支持滚动定位
 */
export function TagIndex({ tagsByLetter }: TagIndexProps) {
  const [activeLetter, setActiveLetter] = useState<string>("")
  // openBlock：<md 下整块是否展开（默认收起，只留一个按钮）；showAll：是否铺满全部标签
  const [openBlock, setOpenBlock] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const letters = Object.keys(tagsByLetter).sort()

  // 跨字母累计的整块序号，供「整块前 24 个」截断使用
  const totalTags = letters.reduce((n, l) => n + (tagsByLetter[l]?.length ?? 0), 0)
  let cursor = 0
  const letterGroups = letters
    .filter((letter) => (tagsByLetter[letter]?.length ?? 0) > 0)
    .map((letter) => ({
      letter,
      items: (tagsByLetter[letter] ?? []).map((tag) => ({ tag, index: cursor++ })),
    }))

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
        {/* <md 默认整块收起：上方已有分类视图，两块内容重复，手机上不再摊开全部 pill。
            只留一个展开按钮；≥md 常显，不受影响。 */}
        {!openBlock && (
          <button
            type="button"
            onClick={() => setOpenBlock(true)}
            className="inline-flex min-h-[32px] items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors md:hidden"
          >
            展开全部标签 ({totalTags})
          </button>
        )}

        <div className={openBlock ? "block" : "hidden md:block"}>
          {letterGroups.map(({ letter, items }) => {
            // 整组都落在 24 个之外：手机端连同吸顶头一起不占位，桌面照常显示
            const beyondBudget = items.length > 0 && items[0].index >= BLOCK_BUDGET && !showAll

            return (
              <div
                key={letter}
                ref={(el) => { sectionRefs.current[letter] = el }}
                data-letter={letter}
                className={`mb-6 last:mb-0${beyondBudget ? " hidden md:block" : ""}`}
              >
                <div className="sticky top-0 bg-card pb-2 mb-3 border-b border-border">
                  <span className="text-sm font-bold text-foreground">
                    {letter === "0-9" ? "#" : letter}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {items.length} 个标签
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {items.map(({ tag, index }) => (
                    <Link
                      key={tag.id}
                      href={tag.slug ? `/credits/tag/${encodeURIComponent(tag.slug)}` : `/tags/${tag.id}`}
                      className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,transform-origin,filter,backdrop-filter] duration-150 ease-in-out hover:scale-105 hover:shadow-1${index >= BLOCK_BUDGET && !showAll ? " hidden md:inline-flex" : ""}`}
                      style={{
                        backgroundColor: `${tag.color || tag.group.color}18`,
                        color: tag.color || tag.group.color,
                        border: `1px solid ${tag.color || tag.group.color}30`,
                      }}
                      title={`${tag.group.name}：${tag.gameCount} 个游戏`}
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

          {/* 整块前 24 个之外的兜底展开：只出现在手机，桌面仍全量渲染 */}
          {totalTags > BLOCK_BUDGET && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="inline-flex min-h-[32px] items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors md:hidden"
            >
              展开全部 ({totalTags})
            </button>
          )}
          {totalTags > BLOCK_BUDGET && showAll && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="inline-flex min-h-[32px] items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors md:hidden"
            >
              收起
            </button>
          )}
        </div>

        {letters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">暂无标签</p>
          </div>
        )}
      </div>
    </div>
  )
}