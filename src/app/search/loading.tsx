export default function SearchLoading() {
  return (
    <div className="py-6">
      {/* 搜索栏骨架 */}
      <div className="mb-6">
        <div className="h-12 w-full rounded-xl bg-muted animate-pulse" />
      </div>

      {/* 排序栏骨架 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["w-16", "w-20", "w-16"].map((w, i) => (
          <div key={i} className={`h-8 ${w} rounded-lg bg-muted animate-pulse`} />
        ))}
      </div>

      {/* 结果数量骨架 */}
      <div className="mb-4 h-5 w-32 rounded bg-muted animate-pulse" />

      {/* 游戏卡片网格骨架 — 列数与实际搜索页一致 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div
              className="w-full animate-pulse rounded-xl bg-muted"
              style={{ aspectRatio: "3 / 4" }}
            />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}