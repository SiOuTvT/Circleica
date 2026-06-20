"use client"

import { useCallback, useRef } from "react"
import { Loader2 } from "lucide-react"

interface LoadMoreButtonProps {
  currentPage: number
  totalPages: number
  loadingMore: boolean
  onLoadMore: () => void
}

/**
 * 论坛加载更多按钮 - 手动分页模式
 * 防止快速点击导致重复请求
 */
export function LoadMoreButton({
  currentPage,
  totalPages,
  loadingMore,
  onLoadMore,
}: LoadMoreButtonProps) {
  // 使用 ref 记录上次点击时间，防止快速重复点击
  const lastClickTimeRef = useRef(0)
  const CLICK_THROTTLE = 300 // 300ms 防抖

  const handleClick = useCallback(() => {
    const now = Date.now()
    if (now - lastClickTimeRef.current < CLICK_THROTTLE) {
      return // 防止快速重复点击
    }
    lastClickTimeRef.current = now
    onLoadMore()
  }, [onLoadMore])

  if (currentPage >= totalPages) {
    return (
      <p className="w-full py-3 text-center text-xs text-muted-foreground ring-1 ring-border rounded-xl bg-card/30">
        已加载全部帖子
      </p>
    )
  }

  const remaining = totalPages - currentPage
  const remainingText = remaining > 1 ? `还剩 ${remaining} 页` : "最后一页"

  return (
    <button
      onClick={handleClick}
      disabled={loadingMore}
      className="w-full rounded-xl bg-card/50 py-3 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      aria-busy={loadingMore}
      aria-label={loadingMore ? "加载中" : `加载更多帖子 (${remainingText})`}
    >
      {loadingMore ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          <span>加载中...</span>
        </>
      ) : (
        <>
          <span>加载更多帖子</span>
          <span className="text-xs opacity-60">({remainingText})</span>
        </>
      )}
    </button>
  )
}