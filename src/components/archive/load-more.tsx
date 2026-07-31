"use client"

import { Loader2 } from "lucide-react"

interface ArchiveLoadMoreProps {
  /** 已加载条数 */
  loaded: number
  /** 总条数 */
  total: number
  /** 实体名（如「制作组」「创作者」） */
  entity: string
  loadingMore: boolean
  onLoadMore: () => void
}

/**
 * Archive 列表增量加载控件（Framework，仅 Archive 浏览体系）。
 *
 * 与论坛 LoadMoreButton 同视觉语言：bg-card/50 + ring-1 + hover:bg-secondary。
 * Studio / Creator 列表由「一次全量 pageSize=1000」改为分批增量拉取后，
 * 用本控件承接「已展示 X / 共 Y + 加载更多」；加载完毕显示收尾态。
 */
export function ArchiveLoadMore({ loaded, total, entity, loadingMore, onLoadMore }: ArchiveLoadMoreProps) {
  if (loaded >= total) {
    return (
      <p className="mt-6 w-full rounded-xl bg-card/30 py-3 text-center text-xs text-muted-foreground ring-1 ring-border">
        已加载全部{entity}
      </p>
    )
  }
  const remaining = total - loaded
  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground">
        已展示 {loaded} / 共 {total} 个{entity}
      </p>
      <button
        onClick={onLoadMore}
        disabled={loadingMore}
        aria-busy={loadingMore}
        aria-label={loadingMore ? "加载中" : `加载更多${entity}`}
        className="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-card/50 py-3 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loadingMore ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            <span>加载中…</span>
          </>
        ) : (
          <>
            <span>加载更多{entity}</span>
            <span className="text-xs opacity-60">还剩 {remaining} 条</span>
          </>
        )}
      </button>
    </div>
  )
}
