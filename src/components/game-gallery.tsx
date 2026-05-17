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
    <div className="flex flex-col h-[300px] sm:h-[400px] lg:h-[520px]">
      {/* 上卡片：16:10 巨幕预览 */}
      <div
        className="relative overflow-hidden flex-1 min-h-0"
        style={{
          borderRadius: "16px",
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

      {/* 中间缝隙 */}
      <div className="shrink-0 h-2 sm:h-4 lg:h-5" />

      {/* 下卡片：画廊缩略图条 */}
      <div
        className="shrink-0 flex items-center h-[60px] sm:h-[80px] lg:h-[100px]"
        style={{
          borderRadius: "16px",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
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
  )
}