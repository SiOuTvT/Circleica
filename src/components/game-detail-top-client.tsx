"use client"

import { cn } from "@/lib/utils"
import { Download, Heart, Loader2, Share2 } from "lucide-react"
import { CollectionPickerDialog } from "./collection-picker-dialog"
import { ConfirmDialog } from "./ui/confirm-dialog"
import { useGameFavorite } from "./game-detail/use-game-favorite"

export function GameDetailTopClient({
  gameId,
  downloadLinks,
  onDownloadClick,
  scrollToResources = false,
  compact = false,
}: {
  gameId: string
  downloadLinks: { label: string; url: string }[]
  onDownloadClick?: () => void
  /** 点击下载时自动滚动到资源区 */
  scrollToResources?: boolean
  /** 紧凑模式：三个按钮等宽并排，用于手机端卡片内 */
  compact?: boolean
}) {
  // 收藏流程与档案卡底部收藏长条共用 useGameFavorite —— 单一实现，不另写一份
  const {
    isLoggedIn, fav, unfavoriting, dialogOpen, setDialogOpen, confirmOpen, setConfirmOpen,
    handleFavoriteClick, handleUnfavorite, handleSelect,
  } = useGameFavorite(gameId)

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
        {/* 三颗同档按钮：32 高 / 13px / 600 / rounded-lg，间距 8px */}
        <div className="flex w-fit items-center gap-2">
          {/* 收藏 */}
          <button
            onClick={handleFavoriteClick}
            disabled={!isLoggedIn || unfavoriting}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold ring-1 transition-all",
              fav
                ? "bg-primary/10 ring-primary/20 text-primary"
                : "bg-card ring-border text-muted-foreground hover:text-foreground hover:ring-foreground/20"
            )}
          >
            {unfavoriting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Heart
                className="h-3.5 w-3.5"
                strokeWidth={2}
                fill={fav ? "currentColor" : "none"}
              />
            )}
            <span>收藏</span>
          </button>

          {/* 下载资源 */}
          <button
            onClick={handleDownloadClick}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            <span>下载资源</span>
          </button>

          {/* 分享 */}
          <button
            onClick={handleShare}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-card px-3 text-[13px] font-semibold text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground hover:ring-foreground/20"
          >
            <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
            <span>分享</span>
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
            <Download className="h-4 w-4" strokeWidth={2} />
            下载
          </a>
        )}

        {/* 收藏按钮 */}
        <button
          onClick={handleFavoriteClick}
          disabled={!isLoggedIn || unfavoriting}
          className={cn(
            "flex items-center justify-center rounded-lg px-3.5 py-2.5 transition duration-150 ease-in-out disabled:opacity-50 border",
            fav
              ? "bg-secondary border-border text-rose-500"
              : "bg-secondary border-border/70 text-muted-foreground"
          )}
        >
          {unfavoriting ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Heart
              className="h-4 w-4 transition-colors"
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
          <Share2 className="h-4 w-4" strokeWidth={2} />
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