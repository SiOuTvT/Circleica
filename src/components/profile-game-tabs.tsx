"use client"

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface Game { id: string; title: string; coverImage: string; isNsfw: boolean }
interface PlayStatusGame { game: Game; status: string }

interface Props {
  faveGame: { id: string; title: string; coverImage: string; originalWork: string } | null
  favGames: Game[]
  playStatusGames: PlayStatusGame[]
}

const TABS = [
  { key: "fav",    label: "收藏" },
  { key: "wantPlay", label: "想玩" },
  { key: "playing",  label: "在玩" },
  { key: "played",   label: "玩过" },
]

export function ProfileGameTabs({ faveGame, favGames, playStatusGames }: Props) {
  const [activeTab, setActiveTab] = useState("fav")

  const wantPlay = playStatusGames.filter(p => p.status === "想玩").map(p => p.game)
  const playing  = playStatusGames.filter(p => p.status === "在玩").map(p => p.game)
  const played   = playStatusGames.filter(p => p.status === "玩过").map(p => p.game)

  const counts: Record<string, number> = {
    fav: favGames.length,
    wantPlay: wantPlay.length,
    playing:  playing.length,
    played:   played.length,
  }

  const currentGames: Record<string, Game[]> = {
    fav: favGames, wantPlay, playing, played,
  }

  const games = currentGames[activeTab] ?? []

  return (
    <div className="p-5 sm:p-6 space-y-4">
      {/* 本命游戏 */}
      {faveGame && (
        <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="h-4 w-0.5 rounded-full bg-gradient-to-b from-blue-400 to-blue-400" />
            本命游戏
          </h2>
          <Link href={`/games/${faveGame.id}`}
            className="flex items-center gap-3 rounded-xl bg-secondary p-3 ring-1 ring-border transition-all hover:bg-accent">
            {faveGame.coverImage ? (
              <Image src={faveGame.coverImage} alt={faveGame.title} width={56} height={70}
                className="h-[70px] w-[56px] rounded-lg object-cover shrink-0" />
            ) : (
              <div className="h-[70px] w-[56px] shrink-0 rounded-lg bg-muted" />
            )}
            <div>
              <p className="font-semibold text-foreground">{faveGame.title}</p>
              {faveGame.originalWork && <p className="mt-0.5 text-xs text-muted-foreground">{faveGame.originalWork}</p>}
            </div>
          </Link>
        </section>
      )}

      {/* Tab 切换 */}
      <section>
        <div className="mb-3 flex items-center gap-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={[
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === tab.key
                  ? "bg-secondary text-foreground ring-1 ring-border font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}>
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${activeTab === tab.key ? "bg-accent text-foreground" : "bg-muted text-muted-foreground"}`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {games.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {activeTab === "fav" ? "还没有收藏任何游戏~" : `还没有「${TABS.find(t => t.key === activeTab)?.label}」的游戏`}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {games.slice(0, 12).map(g => (
              <Link key={g.id} href={`/games/${g.id}`}
                className="group overflow-hidden rounded-xl bg-secondary/50 ring-1 ring-border transition-all hover:-translate-y-0.5 hover:ring-primary/30">
                <div className="relative" style={{ aspectRatio: "3/4" }}>
                  {g.coverImage ? (
                    <Image src={g.coverImage} alt={g.title} fill
                      className="object-cover transition-transform group-hover:scale-[1.04]" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-xs">无封面</div>
                  )}
                </div>
                <p className="truncate px-2 py-1.5 text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                  {g.title}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}