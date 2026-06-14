"use client"

import { cn } from "@/lib/utils"
import { useCallback } from "react"

interface TagLetterNavProps {
  letters: string[]
  activeLetter: string
  onLetterClick: (letter: string) => void
}

/**
 * 字母索引导航
 * 显示 A-Z、0-9、# 等索引按钮，点击滚动到对应区域
 */
export function TagLetterNav({ letters, activeLetter, onLetterClick }: TagLetterNavProps) {
  const handleClick = useCallback(
    (letter: string) => {
      onLetterClick(letter)
    },
    [onLetterClick]
  )

  return (
    <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border py-2">
      <div className="flex flex-wrap items-center gap-1">
        {letters.map((letter) => (
          <button
            key={letter}
            onClick={() => handleClick(letter)}
            className={cn(
              "min-w-[2rem] px-2 py-1 text-xs font-medium rounded-md transition-colors",
              activeLetter === letter
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {letter === "0-9" ? "#" : letter}
          </button>
        ))}
      </div>
    </div>
  )
}