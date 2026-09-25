/**
 * 社团索引加载骨架 —— 对齐实际 GalvelicaIndexFilter variant="studio"。
 *
 * 实际：容器 .galvelica-studios-grid（桌面 2 列文字条目、<1024px 1 列），
 * 单元 .galvelica-entry.galvelica-entry-text（书脊 | 社团名 | 「N 部」，无封面列）。
 * 旧骨架画的是「2/3/4 列圆角卡片（头像+名称）」，与实际文字条目形态不符。
 * 本版复用真实语义类，列数与断点自动一致。
 */
export default function Loading() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* 标题占位 */}
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="galvelica-studios-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="galvelica-entry galvelica-entry-text">
            {/* 书脊 */}
            <div className="min-h-[72px] animate-pulse bg-muted" />
            {/* 社团名 */}
            <div className="h-4 w-2/5 animate-pulse rounded bg-muted" />
            {/* 「N 部」 */}
            <div className="h-4 w-10 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
