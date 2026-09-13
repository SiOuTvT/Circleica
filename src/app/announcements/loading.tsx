/**
 * 公告列表加载骨架：与列表行同形（日期列 + 标题/摘要两行），避免首屏跳动。
 */
export default function AnnouncementsLoading() {
  return (
    <div className="space-y-6">
      {/* 页头骨架 */}
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-muted" />
        <div className="min-w-0 flex-1">
          <div className="h-3 w-24 animate-pulse bg-muted" />
          <div className="mt-2 h-7 w-40 animate-pulse bg-muted" />
          <div className="mt-3 h-3 w-64 animate-pulse bg-muted" />
        </div>
      </div>

      {/* 列表骨架 */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-12 items-start gap-4 rounded-xl bg-card px-4 py-3 ring-1 ring-border"
          >
            <div className="h-4 w-[92px] shrink-0 animate-pulse bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/5 animate-pulse bg-muted" />
              <div className="h-3 w-4/5 animate-pulse bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
