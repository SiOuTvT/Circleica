"use client"

import { GalleryStrip, HeroCarousel } from "@/components/gallery-hero"
import { useState } from "react"

/**
 * 游戏画廊组合组件 — 管理巨幕与缩略图条之间的联动状态
 * 响应式布局：桌面端固定520px高度，移动端自适应
 */
export function GameGallery({
  screenshots,
  gameTitle,
}: {
  screenshots: string[]
  gameTitle: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <div className="flex flex-col h-[300px] sm:h-[400px] lg:h-[520px] min-w-0">
      {/* 上卡片：巨幕预览 — 占 60% */}
      <div
        className="relative overflow-hidden flex-[7.5] min-h-0 w-full"
        style={{
          borderRadius: "16px",
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <HeroCarousel
          screenshots={screenshots}
          gameTitle={gameTitle}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
        />
      </div>

      {/* 下区域：缝隙 + 缩略图条 — 占 40% */}
      <div className="flex-[2.5] min-h-0 flex flex-col">
        <div className="shrink-0 h-1.5 sm:h-3 lg:h-4" />

        {/* 下卡片：画廊缩略图条 */}
        <div
          className="flex-1 min-h-0 flex items-center"
          style={{
            borderRadius: "16px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          <GalleryStrip
            screenshots={screenshots}
            gameTitle={gameTitle}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
          />
        </div>
      </div>
    </div>
  )
}