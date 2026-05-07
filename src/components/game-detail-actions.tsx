"use client"

import { cn } from "@/lib/utils"
import { AlertTriangle, Heart } from "lucide-react"
import { useState } from "react"

interface Props {
  gameId: string
  isFav: boolean
  favCount: number
  playStatus: string | null
  reportCount: number
  isLoggedIn: boolean
}

const PLAY_STATUSES = ["想玩", "在玩", "玩过"]

export function GameDetailActions({ gameId, isFav: initFav, favCount: initCount, playStatus: initPlay, reportCount: initReport, isLoggedIn }: Props) {
  const [isFav, setIsFav] = useState(initFav)
  const [favCount, setFavCount] = useState(initCount)
  const [playStatus, setPlayStatus] = useState(initPlay)
  const [reportCount, setReportCount] = useState(initReport)
  const [reported, setReported] = useState(initReport >= 3)

  async function toggleFav() {
    if (!isLoggedIn) return
    const res = await fetch(`/api/games/${gameId}/favorite`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      setIsFav(data.isFav)
      setFavCount(data.count)
    }
  }

  async function setPlay(status: string) {
    if (!isLoggedIn) return
    const res = await fetch(`/api/games/${gameId}/play-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setPlayStatus(status)
  }

  async function report() {
    if (!isLoggedIn || reported) return
    const res = await fetch(`/api/games/${gameId}/report`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      setReportCount(data.count)
      if (data.count >= 3) setReported(true)
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {/* 收藏 */}
      <button
        onClick={toggleFav}
        disabled={!isLoggedIn}
        className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ring-1 transition-all",
          isFav
            ? "bg-blue-500/10 text-blue-400 ring-blue-500/30 hover:bg-blue-500/15"
            : "bg-zinc-800 text-zinc-400 ring-white/[0.06] hover:bg-zinc-700 hover:text-zinc-200",
          !isLoggedIn && "cursor-not-allowed opacity-50"
        )}
      >
        <Heart className={cn("h-4 w-4", isFav && "fill-blue-400")} strokeWidth={1.5} />
        {isFav ? "已收藏" : "收藏"}
        <span className="text-xs opacity-60">{favCount}</span>
      </button>

      {/* 玩过状态 */}
      {isLoggedIn && (
        <div className="flex gap-1">
          {PLAY_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setPlay(s)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium ring-1 transition-all",
                playStatus === s
                  ? "bg-sky-500/10 text-sky-400 ring-sky-500/30"
                  : "bg-zinc-800 text-zinc-500 ring-white/[0.06] hover:bg-zinc-700 hover:text-zinc-300"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 失效反馈 */}
      <button
        onClick={report}
        disabled={reported || !isLoggedIn}
        className={cn(
          "ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ring-1 transition-all",
          reported
            ? "bg-amber-500/10 text-amber-400 ring-amber-500/20 cursor-default"
            : "bg-zinc-800 text-zinc-500 ring-white/[0.06] hover:bg-zinc-700 hover:text-amber-400",
          !isLoggedIn && "cursor-not-allowed opacity-40"
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
        {reported ? "已反馈失效" : "反馈失效"}
      </button>
    </div>
  )
}
