"use client"

import { GameCard, type GameCardData } from "@/components/game-card"
import { Sparkles } from "lucide-react"
import { DiscoverySection } from "@/components/discover/section"

/**
 * 为你推荐：直接展示浏览量最高的作品（来自服务端按 viewCount 排序的 popular）。
 * 不做"基于兴趣的相似推荐"——用户明确表示想要的就是浏览量高的作品，避免误导。
 */
export function ForYou({ popular = [] }: { popular?: GameCardData[] }) {
  const items = (popular ?? []).slice(0, 8)

  return (
    <DiscoverySection title="为你推荐" description="大家都在看的热门作品" icon={Sparkles}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无可推荐内容</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {items.map((card) => (
            <GameCard key={card.id} game={card} showTags={false} />
          ))}
        </div>
      )}
    </DiscoverySection>
  )
}
