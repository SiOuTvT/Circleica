"use client"

import { Calendar, ExternalLink, Gamepad2, Heart, MessageSquare } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface GameLite {
  id: string
  title: string
  coverImage?: string
  isNsfw?: boolean
  originalWork?: string
}

interface CommentLite {
  id: string
  content: string
  createdAt: Date
  game: { id: string; title: string }
}

interface Props {
  faveGame: GameLite | null
  favGames: GameLite[]
  playStatusGames: { game: GameLite; status: string }[]
  comments: CommentLite[]
}

type TabKey = "fave" | "favorites" | "comments" | "play"

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "fave", label: "最爱", icon: Heart },
  { key: "favorites", label: "收藏", icon: Heart },
  { key: "comments", label: "评论", icon: MessageSquare },
  { key: "play", label: "足迹", icon: Gamepad2 },
]

export function ProfileContentTabs({ faveGame, favGames, playStatusGames, comments }: Props) {
  const [active, setActive] = useState<TabKey>("fave")

  return (
    <div>
      {/* Tab 栏 — 统一凹槽 + 圆角活动方块 */}
      <div className="flex gap-1 rounded-xl p-1"
        style={{ backgroundColor: "var(--tab-trough)" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className="relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ease-out"
              style={{
                backgroundColor: isActive ? "var(--tab-active)" : "transparent",
                color: isActive ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)" : "none",
                fontWeight: isActive ? 700 : 500,
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--tab-hover-text)" }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--tab-inactive-text)" }}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab 内容 */}
      <div className="p-4 sm:p-5">
        {active === "fave" && <FaveGameTab faveGame={faveGame} />}
        {active === "favorites" && <FavoritesTab favGames={favGames} />}
        {active === "comments" && <CommentsTab comments={comments} />}
        {active === "play" && <PlayTab playStatusGames={playStatusGames} />}
      </div>
    </div>
  )
}

function FaveGameTab({ faveGame }: { faveGame: GameLite | null }) {
  if (!faveGame) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Heart className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">还没有设置最爱游戏</p>
      </div>
    )
  }
  return (
    <Link href={`/games/${faveGame.id}`} className="group flex items-center gap-4 rounded-xl bg-secondary/40 p-4 transition-colors hover:bg-secondary/70">
      {faveGame.coverImage ? (
        <img src={faveGame.coverImage} alt={faveGame.title} className="h-20 w-14 rounded-lg object-cover" />
      ) : (
        <div className="flex h-20 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Heart className="h-6 w-6" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{faveGame.title}</p>
        {faveGame.originalWork && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">原作：{faveGame.originalWork}</p>
        )}
        <p className="mt-1 text-[11px] text-primary flex items-center gap-1">
          查看详情 <ExternalLink className="h-3 w-3" />
        </p>
      </div>
    </Link>
  )
}

function FavoritesTab({ favGames }: { favGames: GameLite[] }) {
  if (favGames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Heart className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">还没有收藏游戏</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {favGames.map((g) => (
        <Link key={g.id} href={`/games/${g.id}`} className="group">
          {g.coverImage ? (
            <img src={g.coverImage} alt={g.title} className="aspect-[3/4] w-full rounded-lg object-cover transition-transform group-hover:scale-[1.02]" />
          ) : (
            <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Heart className="h-6 w-6" />
            </div>
          )}
          <p className="mt-1.5 text-[11px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{g.title}</p>
        </Link>
      ))}
    </div>
  )
}

function CommentsTab({ comments }: { comments: CommentLite[] }) {
  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">还没有发表评论</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      {comments.map((c) => (
        <Link
          key={c.id}
          href={`/games/${c.game.id}`}
          className="group rounded-xl bg-secondary/40 p-3.5 transition-colors hover:bg-secondary/70"
        >
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1.5">
            <span className="font-medium text-foreground group-hover:text-primary transition-colors">{c.game.title}</span>
            <span>·</span>
            <Calendar className="h-3 w-3" />
            <span>{new Date(c.createdAt).toLocaleDateString("zh-CN")}</span>
          </div>
          <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">{c.content}</p>
        </Link>
      ))}
    </div>
  )
}

function PlayTab({ playStatusGames }: { playStatusGames: { game: GameLite; status: string }[] }) {
  if (playStatusGames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Gamepad2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">还没有游玩记录</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    "想玩": "bg-sky-500/10 text-sky-400",
    "在玩": "bg-amber-500/10 text-amber-400",
    "玩过": "bg-emerald-500/10 text-emerald-400",
    "搁置": "bg-zinc-500/10 text-zinc-400",
    "弃坑": "bg-rose-500/10 text-rose-400",
  }

  return (
    <div className="flex flex-col gap-2">
      {playStatusGames.map(({ game, status }) => (
        <Link key={game.id} href={`/games/${game.id}`} className="group flex items-center gap-3 rounded-xl bg-secondary/40 p-3 transition-colors hover:bg-secondary/70">
          {game.coverImage ? (
            <img src={game.coverImage} alt={game.title} className="h-12 w-9 rounded-md object-cover" />
          ) : (
            <div className="flex h-12 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Gamepad2 className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{game.title}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[status] || "bg-muted text-muted-foreground"}`}>
            {status}
          </span>
        </Link>
      ))}
    </div>
  )
}