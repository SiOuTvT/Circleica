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
    <div className="flex h-full min-w-0 flex-col">
      {/* 上卡片：巨幕预览 — 桌面端 flex-fill 填满列高（与左列始终等高），移动端保持 16:9 */}
      <div className="relative overflow-hidden w-full aspect-video rounded-2xl bg-card lg:aspect-auto lg:flex-1 lg:min-h-0">
        <HeroCarousel
          screenshots={screenshots}
          gameTitle={gameTitle}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
        />
      </div>

      {/* 下区域：缝隙 + 缩略图条（固定高度钉底） */}
      <div className="flex shrink-0 flex-col">
        <div className="h-1.5 sm:h-3 lg:h-4" />

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