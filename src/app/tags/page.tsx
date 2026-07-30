import Link from "next/link"
import { getTagBrowserData } from "@/lib/tags-browser"
import { TagCategory } from "@/components/tags/tag-category"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { AZIndex } from "@/components/archive/az-index"
import { TagCard } from "@/components/archive/tag-card"
import { StatsBar } from "@/components/archive/stats-bar"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"
import { computeDensity } from "@/components/archive/density"
import { LayoutGrid, Tag as TagIcon } from "lucide-react"

import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "标签 · 标签图鉴",
  description: "按标签浏览游戏，发现你感兴趣的作品类型与分类。Circleica 标签图鉴。",
  keywords: ["标签", "游戏标签", "标签浏览", "同人游戏", "Circleica"],
  openGraph: {
    title: "标签 · 标签图鉴 · Circleica",
    description: "按标签浏览游戏，发现你感兴趣的作品类型与分类。",
    images: ["/opengraph-image"],
  },
  alternates: { canonical: "/tags" },
}

export const revalidate = 300 // 5 分钟缓存

const ANCHOR_PREFIX = "tag-letter-"

/**
 * 标签图鉴（Archive 浏览体系，tag 实体）
 * 列表 Archive 化：ArchiveShell + ArchiveHero(tag) + StatsBar + 补充区块(热门云/分类) + AZIndex + TagCard 网格。
 * 保持 Server Component：AZIndex 静态渲染 + anchor 跳转，不引入额外 hydration。
 */
export default async function TagsPage() {
  const data = await getTagBrowserData()

  const totalTags = data.stats.totalTags
  const totalGames = data.stats.totalGames
  const letters = Object.keys(data.tagsByLetter).sort()
  const density = computeDensity(totalTags)

  return (
    <ArchiveShell
      entity="tag"
      density={density}
      breadcrumb={
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            首页
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-foreground">标签</span>
        </nav>
      }
      header={
        <ArchiveHero
          variant="tag"
          eyebrow="标签图鉴"
          title="标签"
          lede="通过标签发现游戏，按分类与首字母索引浏览。"
          meta={
            <>
              <span>
                共 <span className="tabular-nums text-foreground">{totalTags}</span> 个标签
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span>
                <span className="tabular-nums text-foreground">{totalGames}</span> 部作品
              </span>
            </>
          }
        />
      }
    >
      <StatsBar
        items={[
          { label: "标签数", value: totalTags },
          { label: "作品数", value: totalGames },
          { label: "分类数", value: data.tagGroups.length },
        ]}
      />

      {/* 补充区块：分类浏览（只要有分类就显示，不依赖标签是否关联作品） */}
      {data.tagGroups.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-1.5 text-sm font-heading font-semibold text-foreground">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" strokeWidth={2} /> 按分类浏览
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.tagGroups.map((group) => (
              <TagCategory key={group.id} group={group} />
            ))}
          </div>
        </section>
      )}

      {/* 全部标签索引：AZIndex（静态）+ TagCard 网格（按首字母分组）；无标签时占位 */}
      <section>
        <h2 className="mb-4 flex items-center gap-1.5 text-sm font-heading font-semibold text-foreground">
          <TagIcon className="h-4 w-4 text-muted-foreground" strokeWidth={2} /> 全部标签
        </h2>
        {letters.length === 0 ? (
          <ArchivePlaceholder
            state="empty"
            entity="tag"
            message="暂无已收录作品的标签"
          />
        ) : (
          <>
            <AZIndex available={letters} anchorPrefix={ANCHOR_PREFIX} />
            <div className="mt-4 space-y-6">
              {letters.map((letter) => {
                const tags = data.tagsByLetter[letter]
                if (!tags || tags.length === 0) return null
                return (
                  <div key={letter} id={`${ANCHOR_PREFIX}${encodeURIComponent(letter)}`} className="scroll-mt-20">
                    <div className="mb-3 flex items-baseline gap-2 border-b border-border/50 pb-1.5">
                      <span className="text-sm font-bold text-foreground">
                        {letter === "0-9" ? "#" : letter}
                      </span>
                      <span className="text-xs text-muted-foreground/60">{tags.length} 个标签</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                      {tags.map((tag) => (
                        <TagCard key={tag.id} tag={tag} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>
    </ArchiveShell>
  )
}
