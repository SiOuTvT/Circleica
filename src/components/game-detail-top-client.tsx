"use client"

import { Download, Heart, Share2 } from "lucide-react"
import { useState } from "react"

export function GameDetailTopClient({
  gameId,
  downloadLinks,
  isFav,
  favCount,
  isLoggedIn,
}: {
  gameId: string
  downloadLinks: { label: string; url: string }[]
  isFav: boolean
  favCount: number
  isLoggedIn: boolean
}) {
  const [fav, setFav] = useState(isFav)
  const [favCnt, setFavCnt] = useState(favCount)

  async function toggleFav() {
    if (!isLoggedIn) return
    const res = await fetch(`/api/games/${gameId}/favorite`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      setFav(data.isFav)
      setFavCnt(data.count)
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: document.title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* 下载按钮 — 点击跳转到页面底部资源区 */}
      {downloadLinks.length > 0 && (
        <a
          href={downloadLinks[0].url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--clr-blue)", color: "#000" }}
        >
          <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
          下载
        </a>
      )}

      {/* 收藏按钮 */}
      <button
        onClick={toggleFav}
        disabled={!isLoggedIn}
        className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium transition-all disabled:opacity-50"
        style={{
          backgroundColor: fav ? "var(--clr-blue)" : "hsl(var(--secondary))",
          color: fav ? "#000" : "hsl(var(--muted-foreground))",
          border: fav ? "none" : "1px solid hsl(var(--border))",
        }}
      >
        <Heart
          className="w-3.5 h-3.5"
          strokeWidth={2.5}
          fill={fav ? "#000" : "none"}
        />
        {favCnt}
      </button>

      {/* 分享按钮 */}
      <button
        onClick={handleShare}
        className="flex items-center justify-center rounded-xl p-2.5 transition-colors"
        style={{
          background: "hsl(var(--secondary))",
          border: "1px solid hsl(var(--border))",
          color: "hsl(var(--muted-foreground))",
        }}
      >
        <Share2 className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
    </div>
  )
}