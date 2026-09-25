/**
 * 标签索引加载骨架 —— 对齐实际 GalvelicaIndexFilter variant="strip"。
 *
 * 实际：容器 .galvelica-strip（条状标签横排流式，非网格），单元 .galvelica-strip-item。
 * 旧骨架画的是「2/3/4 列网格 + h-10 块」，与实际条状形态不符。
 * 本版复用真实语义类，形态自动一致。
 */
export default function Loading() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* 标题占位 */}
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="galvelica-strip">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="galvelica-strip-item">
            <div className="h-4 animate-pulse rounded bg-muted" style={{ width: `${56 + ((i * 13) % 40)}px` }} />
          </div>
        ))}
      </div>
    </div>
  )
}
