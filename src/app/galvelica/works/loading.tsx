/**
 * 作品库加载骨架 —— 对齐实际 WorkGrid（src/components/galvelica/work-card.tsx）。
 *
 * 实际：容器 .galvelica-grid-2（桌面 2 列、<1024px 1 列），单元 .galvelica-entry
 * （书脊 | 62px 封面 | 文字区 | 右端）。
 * 旧骨架画的是「2/3/4 列竖版卡片网格（aspect-[3/4]）」，加载完会从卡片网格跳成双列条目。
 * 本版直接复用真实语义类，列数/断点/间距全部跟随 CSS，改版时自动同步。
 */
export default function Loading() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* 标题占位 */}
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="galvelica-grid-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="galvelica-entry">
            {/* 书脊（对齐 .galvelica-entry-spine 的 min-height 72） */}
            <div className="min-h-[72px] animate-pulse bg-muted" />
            {/* 封面 62px（3:4） */}
            <div className="aspect-[3/4] w-[62px] animate-pulse bg-muted" />
            {/* 文字区：标题 + 元信息 */}
            <div className="min-w-0 space-y-2">
              <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            </div>
            {/* 右端（年份 / 标签数） */}
            <div className="h-4 w-10 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
