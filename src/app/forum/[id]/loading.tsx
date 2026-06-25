export default function ForumPostDetailLoading() {
  return (
    <div className="py-4 sm:py-6">
      {/* 返回导航骨架 */}
      <div className="mb-3 h-5 w-20 rounded bg-muted animate-pulse" />

      <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
        {/* 帖子内容骨架 */}
        <div className="p-5 sm:p-6 md:px-8">
          {/* 作者信息 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            </div>
          </div>
          {/* 标题 */}
          <div className="h-6 w-3/4 rounded bg-muted animate-pulse mb-3" />
          {/* 内容 */}
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${90 - i * 12}%` }} />
            ))}
          </div>
          {/* 操作按钮 */}
          <div className="mt-4 flex gap-2">
            <div className="h-9 w-16 rounded-lg bg-muted animate-pulse" />
            <div className="h-9 w-16 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>

        {/* 评论区骨架 */}
        <div className="border-t border-border p-5 sm:p-6 md:px-8">
          <div className="h-4 w-16 rounded bg-muted animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-full rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
