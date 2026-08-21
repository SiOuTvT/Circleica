"use client"

import Link from "next/link"
import Image from "next/image"
import type { GameCardData } from "@/components/game-card"

interface HomeFeaturedGamesProps {
  games: GameCardData[]
}

// 固定5个，上3下2紧凑拼贴
const TOP_COUNT = 3
const BOTTOM_COUNT = 2
const TOTAL = TOP_COUNT + BOTTOM_COUNT

// 重叠量
const H_OVERLAP = 12  // 水平重叠 px
const V_OVERLAP = 18  // 垂直重叠 px

// 斜切偏移量（每侧占面板宽度的百分比）
const CUT = 3

// 上排错位：A=0 B=+4px C=-3px
const TOP_Y_OFFSETS = [0, 4, -3]
// 下排错位：D=-2px E=+3px
const BOT_Y_OFFSETS = [-2, 3]

// clip-path: 左内斜 / 右内斜 / 两侧内斜
function clipLeft(): string {
  return `polygon(${CUT}% 0, 100% 0, 100% 100%, ${CUT}% 100%, 0 calc(100% - ${CUT}%))`
}
function clipRight(): string {
  return `polygon(0 0, calc(100% - ${CUT}%) 0, 100% ${CUT}%, calc(100% - ${CUT}%) 100%, 0 100%)`
}
function clipBoth(): string {
  return `polygon(${CUT}% 0, calc(100% - ${CUT}%) 0, 100% ${CUT}%, calc(100% - ${CUT}%) 100%, ${CUT}% 100%, 0 calc(100% - ${CUT}%))`
}
function getClip(idx: number, row: "top" | "bot"): string | undefined {
  if (row === "top") {
    if (idx === 0) return clipRight()           // A: 右切
    if (idx === TOP_COUNT - 1) return clipLeft() // C: 左切
    return clipBoth()                            // B: 双切
  }
  // bottom row: D=左切, E=右切
  if (idx === 0) return clipLeft()
  return clipRight()
}

export function HomeFeaturedGames({ games }: HomeFeaturedGamesProps) {
  const topGames = games.slice(0, TOP_COUNT)
  const botGames = games.slice(TOP_COUNT, TOTAL)
  if (topGames.length === 0) return null

  return (
    <section className="w-full select-none" aria-label="精选游戏">
      {/* Label */}
      <div className="flex items-center gap-3 mb-3">
        <span className="h-px flex-1 bg-border/40" />
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground/25 flex-shrink-0">
          Featured
        </p>
        <span className="h-px flex-1 bg-border/40" />
      </div>

      {/* 拼贴容器：宽度55-60%，高度200-240px */}
      <div
        className="relative"
        style={{ width: "58%", maxWidth: "700px", minHeight: "220px" }}
      >
        {/* ── 上排：3个 ── */}
        <div className="flex" style={{ gap: `-${H_OVERLAP}px` }}>
          {topGames.map((game, i) => (
            <Link
              key={game.id}
              href={`/games/${game.serialId ?? game.id}`}
              className="group relative overflow-hidden transition-all duration-500 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-primary"
              style={{
                flex: "1 1 0",
                height: "140px",
                marginLeft: i === 0 ? 0 : -H_OVERLAP,
                zIndex: TOP_COUNT - i,
                clipPath: getClip(i, "top"),
                transform: `translateY(${TOP_Y_OFFSETS[i]}px)`,
              }}
            >
              {game.coverImage ? (
                <Image
                  src={game.coverImage}
                  alt={game.title}
                  fill
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  sizes="20vw"
                  priority={i < 2}
                  quality={80}
                />
              ) : (
                <div className="absolute inset-0 bg-muted/60" />
              )}
              {/* 底部渐变 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
              {/* 标题 */}
              <div className="absolute inset-x-0 bottom-0 z-[2] p-2">
                <h3 className="text-[11px] sm:text-xs font-bold text-white leading-snug line-clamp-1 drop-shadow-md">
                  {game.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {/* ── 下排：2个，向右偏移半格，与上排交错 ── */}
        <div
          className="flex"
          style={{
            gap: `-${H_OVERLAP}px`,
            marginTop: -V_OVERLAP,
            marginLeft: "16.5%",
          }}
        >
          {botGames.map((game, i) => (
            <Link
              key={game.id}
              href={`/games/${game.serialId ?? game.id}`}
              className="group relative overflow-hidden transition-all duration-500 ease-out focus:outline-none focus-visible:outline-2 focus-visible:outline-primary"
              style={{
                flex: "1 1 0",
                height: "130px",
                marginLeft: i === 0 ? 0 : -H_OVERLAP,
                zIndex: BOTTOM_COUNT - i,
                clipPath: getClip(i, "bot"),
                transform: `translateY(${BOT_Y_OFFSETS[i]}px)`,
              }}
            >
              {game.coverImage ? (
                <Image
                  src={game.coverImage}
                  alt={game.title}
                  fill
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  sizes="20vw"
                  quality={80}
                />
              ) : (
                <div className="absolute inset-0 bg-muted/60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 z-[2] p-2">
                <h3 className="text-[11px] sm:text-xs font-bold text-white leading-snug line-clamp-1 drop-shadow-md">
                  {game.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
