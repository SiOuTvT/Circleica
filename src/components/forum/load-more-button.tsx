"use client"

import { Loader2 } from "lucide-react"

interface LoadMoreButtonProps {
  currentPage: number
  totalPages: number
  loadingMore: boolean
  onLoadMore: () => void
}

export function LoadMoreButton({
  currentPage,
  totalPages,
  loadingMore,
  onLoadMore,
}: LoadMoreButtonProps) {
  if (currentPage >= totalPages) return null

  return (
    <button
      onClick={onLoadMore}
      disabled={loadingMore}
      className="w-full rounded-xl bg-card/50 py-3 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-secondary hover:text-foreground disabled:opacity-50"
    >
      {loadingMore ? <><Loader2 className="h-4 w-4 mr-2 inline animate-spin" />加载中...</> : "加载更多帖子"}
    </button>
  )
}