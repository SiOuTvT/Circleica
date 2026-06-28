"use client"

import { cn } from "@/lib/utils"
import { Download, Heart, Loader2, Share2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CollectionPickerDialog } from "./collection-picker-dialog"
import { ConfirmDialog } from "./ui/confirm-dialog"

export function GameDetailTopClient({
  gameId,
  downloadLinks,
  isFav,
  isLoggedIn,
  onDownloadClick,
  scrollToResources = false,
  compact = false,
}: {
  gameId: string
  downloadLinks: { label: string; url: string }[]
  isFav: boolean
  isLoggedIn: boolean
  onDownloadClick?: () => void
  /** 点击下载时自动滚动到资源区 */
  scrollToResources?: boolean
  /** 紧凑模式：三个按钮等宽并排，用于手机端卡片内 */
  compact?: boolean
}) {
  const [fav, setFav] = useState(isFav)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [unfavoriting, setUnfavoriting] = useState(false)

  function handleFavoriteClick() {
    if (!isLoggedIn) return
    if (fav) {
      setConfirmOpen(true)
    } else {
      setDialogOpen(true)
    }
  }

  async function handleUnfavorite() {
    setUnfavoriting(true)
    try {
      const res = await fetch(`/api/games/${gameId}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        setFav(false)
        window.dispatchEvent(new CustomEvent("game-fav-change", { detail: { isFav: false } }))
        toast.success("已取消收藏")
      }
    } finally {
      setUnfavoriting(false)
    }
  }

  function handleSelect(_collectionId: string | null) {
    setFav(true)
    window.dispatchEvent(new CustomEvent("game-fav-change", { detail: { isFav: true } }))
    toast.success("已收藏")
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: document.title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  function handleDownloadClick() {
    if (onDownloadClick) {
      onDownloadClick()
    } else if (scrollToResources) {
      // 切换到资源 Tab（不滚动页面）
      window.dispatchEvent(new CustomEvent("game-detail-switch-tab", { detail: "resource" }))
    }
  }

  const btnBase = "flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all"

  if (compact) {
    // 紧凑模式：三个按钮自适应宽度，不撑满整行
    return (
      <>
        <div className="flex items-center gap-1.5 w-fit">
          {/* 收藏 — 正方形按钮 */}
          <button
            onClick={handleFavoriteClick}
            disabled={!isLoggedIn || unfavoriting}
            className={cn(
              btnBase,
              "p-2.5 rounded-xl ring-1",
              fav
                ? "bg-primary/10 ring-primary/20 text-primary"
                : "bg-card ring-border text-muted-foreground hover:text-foreground hover:ring-foreground/20"
            )}
          >
            {unfavoriting ? (
              <Loader2 className="w-[18px] h-[18px] animate-spin" />
            ) : (
              <Heart
                className="w-[18px] h-[18px]"
                strokeWidth={2}
                fill={fav ? "currentColor" : "none"}
                style={fav ? { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" } : undefined}
              />
            )}
          </button>

          {/* 分享 — 正方形按钮 */}
          <button
            onClick={handleShare}
            className={cn(btnBase, "p-2.5 rounded-xl bg-card ring-1 ring-border text-muted-foreground hover:text-foreground hover:ring-foreground/20")}
          >
            <Share2 className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>

          {/* 下载 */}
          <button
            onClick={handleDownloadClick}
            className={cn(btnBase, "py-2.5 px-3.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs")}
          >
            <Download className="w-[18px] h-[18px]" strokeWidth={2.5} />
            <span>{downloadLinks.length > 0 ? "下载" : "资源"}</span>
          </button>
        </div>

        <CollectionPickerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSelect={handleSelect}
          isFav={fav}
          gameId={gameId}
        />

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="取消收藏"
          description="确定要取消收藏这个游戏吗？"
          confirmText="取消收藏"
          cancelText="再想想"
          variant="destructive"
          onConfirm={handleUnfavorite}
        />
      </>
    )
  }

  // 默认模式（桌面端）
  return (
    <>
      <div className="flex items-center gap-2.5">
        {/* 下载按钮 */}
        {downloadLinks.length > 0 && (
          <a
            href={downloadLinks[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 px-4 text-xs font-semibold transition-opacity hover:opacity-90 bg-primary text-primary-foreground"
          >
            <Download className="w-4 h-4" strokeWidth={2.5} />
            下载
          </a>
        )}

        {/* 收藏按钮 */}
        <button
          onClick={handleFavoriteClick}
          disabled={!isLoggedIn || unfavoriting}
          className={cn(
            "flex items-center justify-center rounded-lg px-3.5 py-2.5 transition-all disabled:opacity-50 border",
            fav
              ? "bg-secondary border-border text-rose-500"
              : "bg-secondary border-border/70 text-muted-foreground"
          )}
        >
          {unfavoriting ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <Heart
              className="w-4 h-4 transition-colors"
              strokeWidth={2}
              fill={fav ? "currentColor" : "none"}
              style={fav ? { filter: "drop-shadow(0 1px 2px rgba(231,76,111,0.4))" } : undefined}
            />
          )}
        </button>

        {/* 分享按钮 */}
        <button
          onClick={handleShare}
          className="flex items-center justify-center rounded-lg px-3.5 py-2.5 transition-colors bg-secondary border border-border/70 text-muted-foreground"
        >
          <Share2 className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      <CollectionPickerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={handleSelect}
        isFav={fav}
        gameId={gameId}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="取消收藏"
        description="确定要取消收藏这个游戏吗？"
        confirmText="取消收藏"
        cancelText="再想想"
        variant="destructive"
        onConfirm={handleUnfavorite}
      />
    </>
  )
}