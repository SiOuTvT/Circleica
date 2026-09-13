"use client"

import { Heart, Loader2 } from "lucide-react"

import { FeedbackBtn } from "@/components/feedback-btn"
import { CollectionPickerDialog } from "@/components/collection-picker-dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import { useGameFavorite } from "./use-game-favorite"

/**
 * 档案卡底部两条等宽长条：左 = 收藏数量，右 = 反馈问题。
 * 样式基准沿用 GameDetailTopClient 的 btnBase（rounded-lg + 14px gap + 600 字重），
 * 只补「高度 32 / bg-card / ring-1」三项，不引入新颜色、不加 shadow。
 */
const barBase =
  "flex flex-1 items-center justify-center gap-1.5 rounded-lg h-8 text-[13px] font-semibold bg-card ring-1 ring-border transition-[color,background-color,box-shadow,opacity] duration-200"

export function GameInfoActions({
  gameId,
  favoriteCount,
}: {
  gameId: string
  favoriteCount?: number
}) {
  const {
    fav, unfavoriting, dialogOpen, setDialogOpen, confirmOpen, setConfirmOpen,
    handleFavoriteClick, handleUnfavorite, handleSelect,
  } = useGameFavorite(gameId)

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleFavoriteClick}
          className={cn(barBase, "text-foreground hover:opacity-80")}
        >
          {unfavoriting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className="h-3.5 w-3.5" strokeWidth={2} fill={fav ? "currentColor" : "none"} />
          )}
          <span>收藏</span>
          <span className="tabular-nums">{favoriteCount ?? 0}</span>
        </button>

        <FeedbackBtn
          gameId={gameId}
          className={cn(barBase, "text-muted-foreground hover:text-foreground")}
        />
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
