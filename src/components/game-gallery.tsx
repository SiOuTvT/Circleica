"use client"

import { GalleryStrip, HeroCarousel } from "@/components/gallery-hero"
import { useState } from "react"

/**
 * 游戏画廊组合组件 — 管理巨幕与缩略图条之间的联动状态
 * 右侧总高 = 400px (巨幕) + 20px (gap) + 100px (画廊条) = 520px
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
    <div className="flex flex-col" style={{ height: "520px" }}>
      {/* 上卡片：16:10 巨幕预览 */}
      <div
        className="relative overflow-hidden flex-1"
        style={{
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          minHeight: 0,
        }}
      >
        <HeroCarousel
          screenshots={screenshots}
          gameTitle={gameTitle}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
        />
      </div>

      {/* 中间缝隙 20px */}
      <div className="shrink-0" style={{ height: "20px" }} />

      {/* 下卡片：画廊缩略图条 100px */}
      <div
        className="flex items-center"
        style={{
          height: "100px",
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