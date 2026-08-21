/**
 * 轻量统计数据区域 —— 本轮只预留结构位置，不显示实际数据。
 *
 * 未来确定具体指标后在此实现。
 * 现在只渲染一个空的占位结构。
 */
export function HomeStatsPlaceholder() {
  return (
    <div className="w-full py-3">
      <div className="flex items-center justify-center gap-6 sm:gap-10 text-muted-foreground/20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Stats</span>
          <span className="text-[10px]">·</span>
        </div>
        {/* 此处未来放置统计数据占位 */}
      </div>
    </div>
  )
}
