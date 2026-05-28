"use client"

import Link from "next/link"
import { SafeImage } from "./safe-image"

type RelatedGame = {
  id: string
  title: string
  coverImage: string | null
  originalWork: string | null
}

export function RelatedGames({ games }: { games: RelatedGame[] }) {
  if (games.length === 0) return null

  return (
    <div className="py-4 sm:py-6 lg:py-8">
      <h2 className="mb-3 text-base font-bold text-foreground">相关游戏推荐</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/games/${g.id}`}
            className="group shrink-0 w-[140px] sm:w-[160px]"
          >
            <div className="relative overflow-hidden rounded-xl aspect-[3/4] bg-card ring-1 ring-border transition-all group-hover:ring-primary/30 group-hover:scale-[1.02]">
              {g.coverImage ? (
                <SafeImage
                  src={g.coverImage}
                  alt={g.title}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                <span className="text-xs text-muted-foreground">暂无封面</span>
                </div>
              )}
            </div>
            <p className="mt-1.5 text-xs font-medium text-foreground/80 line-clamp-2 group-hover:text-foreground transition-colors">
              {g.title}
            </p>
            {g.originalWork && (
              <p className="text-[10px] text-muted-foreground line-clamp-1">{g.originalWork}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}