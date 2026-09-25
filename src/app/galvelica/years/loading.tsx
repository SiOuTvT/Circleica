/**
 * 年份索引加载骨架 —— 对齐实际 GalvelicaIndexFilter variant="year"。
 *
 * 实际：容器 .galvelica-year-grid（桌面 6 列；<1024px 3 列；<640px 2 列），
 * 单元 .galvelica-index-card.galvelica-year-cell（年份 + 「N 部」）。
 * 旧骨架用 Tailwind grid-cols-2/4/6，断点方向与实际相反（实际是桌面 6 列、窄屏递减）。
 * 本版复用真实语义类，断点自动一致。
 */
export default function Loading() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* 标题占位 */}
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="galvelica-year-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="galvelica-index-card galvelica-year-cell">
            {/* 年份 */}
            <div className="h-4 w-10 animate-pulse rounded bg-muted" />
            {/* 「N 部」 */}
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
