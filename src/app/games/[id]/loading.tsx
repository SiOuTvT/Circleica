export default function GameDetailLoading() {
  return (
    <div className="pt-2 sm:pt-4 lg:pt-6">
      {/* 面包屑骨架 */}
      <div className="mb-3 flex gap-2">
        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </div>

      {/* ═══ 首屏：两列（≥sm 海报 208 / 信息列 1fr），与 page.tsx 顶部识别区对齐 ═══
          海报为竖版 3:4（窄屏 156×210，≥sm 208×280），信息列依次为：
          标题 → 别名行 → 数据行(浏览/下载/收藏) → 资源标签行 → 动作组(四颗横排) */}
      <div className="flex min-w-0 flex-col gap-2 sm:grid sm:grid-cols-[208px_minmax(0,1fr)] sm:gap-6">
        {/* 左：竖版海报占位 */}
        <div className="h-[210px] w-[156px] shrink-0 animate-pulse rounded-lg bg-muted sm:h-[280px] sm:w-[208px]" />

        {/* 右：信息列占位（gap-3 = 12px，与实际一致） */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {/* ① 标题（响应式字号，占位高度随之递增） */}
          <div className="h-6 w-3/4 animate-pulse rounded bg-muted sm:h-7 lg:h-9" />

          {/* ② 别名行 */}
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />

          {/* ③ 数据行：浏览 / 下载 / 收藏（一行三个） */}
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-16 animate-pulse rounded bg-muted" />
            ))}
          </div>

          {/* ④ 资源标签行：pill 单行 */}
          <div className="flex items-center gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 w-20 shrink-0 animate-pulse rounded-md bg-muted" />
            ))}
          </div>

          {/* ⑤ 动作组：四颗按钮横排（非等宽、非竖排），圆角与实际一致 12px */}
          <div className="flex flex-wrap items-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-xl bg-muted"
                style={{ width: i === 3 ? 112 : 80 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 下方 Tab 骨架 */}
      <div className="space-y-4 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-2">
          {["w-16", "w-16", "w-16", "w-12"].map((w, i) => (
            <div key={i} className={`h-9 ${w} animate-pulse rounded-lg bg-muted`} />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${90 - i * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}
