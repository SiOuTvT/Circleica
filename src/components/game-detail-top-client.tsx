"use client"

import { cn } from "@/lib/utils"
import { Download, Heart, Share2 } from "lucide-react"
import { useState } from "react"
import { CollectionPickerDialog } from "./collection-picker-dialog"

export function GameDetailTopClient({
  gameId,
  downloadLinks,
  isFav,
  isLoggedIn,
}: {
  gameId: string
  downloadLinks: { label: string; url: string }[]
  isFav: boolean
  isLoggedIn: boolean
}) {
  const [fav, setFav] = useState(isFav)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleFavoriteClick() {
    if (!isLoggedIn) return
    // 点击时弹出收藏集选择弹窗
    setDialogOpen(true)
  }

  function handleSelect(_collectionId: string | null) {
    // 收藏集选择完成后更新状态
    setFav(true)
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: document.title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 下载按钮 — 点击跳转到页面底部资源区 */}
        {downloadLinks.length > 0 && (
          <a
            href={downloadLinks[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-opacity hover:opacity-90 bg-primary text-primary-foreground"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
            下载
          </a>
        )}

        {/* 收藏按钮 — 点击弹出收藏集选择 */}
        <button
          onClick={handleFavoriteClick}
          disabled={!isLoggedIn}
          className={cn(
            "flex items-center justify-center rounded-xl p-2.5 transition-all disabled:opacity-50",
            fav
              ? "text-white border border-transparent"
              : "bg-secondary border border-border"
          )}
          style={fav ? { background: "linear-gradient(135deg, #e74c6f, #f06292)" } : undefined}
        >
          <Heart
            className="w-3.5 h-3.5"
            strokeWidth={2.5}
            fill={fav ? "#fff" : "none"}
            style={fav ? { filter: "drop-shadow(0 1px 2px rgba(231,76,111,0.4))" } : undefined}
          />
        </button>

        {/* 分享按钮 */}
        <button
          onClick={handleShare}
          className="flex items-center justify-center rounded-xl p-2.5 transition-colors"
          style={{
            background: "var(--secondary)",
            border: "1px solid var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          <Share2 className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      </div>

      <CollectionPickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={handleSelect}
        isFav={fav}
        gameId={gameId}
      />
    </>
  )
}