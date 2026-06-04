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
    <div className="flex flex-col min-w-0">
      {/* 上卡片：巨幕预览 — 16:9 比例 */}
      <div className="relative overflow-hidden w-full aspect-video rounded-2xl bg-card">
        <HeroCarousel
          screenshots={screenshots}
          gameTitle={gameTitle}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
        />
      </div>

      {/* 下区域：缝隙 + 缩略图条 */}
      <div className="flex flex-col">
        <div className="shrink-0 h-1.5 sm:h-3 lg:h-4" />

        {/* 下卡片：画廊缩略图条 */}
        <div className="h-[72px] sm:h-[80px] lg:h-[88px] flex items-center rounded-2xl bg-card">
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