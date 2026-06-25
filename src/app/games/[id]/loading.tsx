export default function GameDetailLoading() {
  return (
    <div className="pt-2 sm:pt-4 lg:pt-6">
      {/* 面包屑骨架 */}
      <div className="mb-3 flex gap-2">
        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[38%_1fr]">
        {/* 左侧卡片骨架 */}
        <div
          className="flex flex-col"
          style={{
            borderRadius: "16px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {/* 封面骨架 */}
          <div className="px-2.5 sm:px-5 pt-2.5 sm:pt-5 pb-2">
            <div
              className="w-full animate-pulse rounded-xl bg-muted"
              style={{ aspectRatio: "16 / 10" }}
            />
          </div>

          {/* 信息区骨架 */}
          <div className="flex flex-col gap-3 px-2.5 sm:px-5 pb-3 sm:pb-4 pt-2">
            {/* 标题 */}
            <div className="space-y-1.5">
              <div className="h-6 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
            </div>

            {/* 作者 */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
            </div>

            {/* 标签 */}
            <div className="flex gap-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 w-14 rounded-full bg-muted animate-pulse" />
              ))}
            </div>

            {/* 数据 */}
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 w-12 rounded bg-muted animate-pulse" />
              ))}
            </div>

            {/* 按钮 */}
            <div className="flex gap-2 pt-3">
              <div className="h-10 flex-1 rounded-lg bg-muted animate-pulse" />
              <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
        </div>

        {/* 右侧画廊骨架 */}
        <div className="flex flex-col gap-3">
          <div
            className="w-full animate-pulse rounded-2xl bg-muted"
            style={{ aspectRatio: "16 / 9" }}
          />
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 w-28 shrink-0 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </div>
      </div>

      {/* 下方 Tab 骨架 */}
      <div className="py-4 sm:py-6 lg:py-8 space-y-4">
        <div className="flex gap-2">
          {["w-16", "w-16", "w-16", "w-12"].map((w, i) => (
            <div key={i} className={`h-9 ${w} rounded-lg bg-muted animate-pulse`} />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${90 - i * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}