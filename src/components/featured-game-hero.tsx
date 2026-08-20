"use client"

import Image from "next/image"
import Link from "next/link"
import { GameCardData } from "@/components/game-card"

interface FeaturedGameHeroProps {
  game: GameCardData
  description?: string
}

/**
 * 精选游戏 Hero — 手机端首页首屏的视觉锚点。
 *
 * 布局：左封面 + 右信息（移动端上下堆叠）。
 * 封面 16:10，信息区包含标题、标签、描述片段和进入按钮。
 */
export function FeaturedGameHero({ game, description: _description }: FeaturedGameHeroProps) {
  const href = `/games/${game.serialId ?? game.id}`
  const tags = (game.resourceTags ?? [])
    .map((t) => (typeof t === "string" ? { name: t } : t))
    .slice(0, 2)

  // description 字段预留；当前 GameCardData 不含此字段，hero 先展示封面+标题+标签

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-all hover:ring-foreground/10 md:hidden"
    >
      <div className="flex flex-col sm:flex-row">
        {/* 封面 */}
        <div className="relative w-full sm:w-2/5 shrink-0 aspect-[16/10] sm:aspect-auto sm:min-h-[160px] bg-muted">
          {game.coverImage ? (
            <Image
              src={game.coverImage}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, 30vw"
              priority
              quality={80}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
              <span className="text-sm">暂无封面</span>
            </div>
          )}
          {/* 封面底部渐变 */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent sm:hidden" />
        </div>

        {/* 信息区 */}
        <div className="flex flex-1 flex-col justify-center gap-2 px-3.5 py-3 sm:px-4 sm:py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            精选推荐
          </p>
          <h2 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
            {game.title}
          </h2>

          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
            查看详情
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}
