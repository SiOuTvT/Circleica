/**
 * 作品详情加载骨架 —— 对齐实际 WorkDetailView（src/components/galvelica/work-detail.tsx）。
 *
 * 实际主结构（自顶向下）：
 *   .galvelica-detail-head  → 左 .galvelica-detail-card（3:4 封面 + 浏览数）
 *                           → 右 .galvelica-detail-main（标题 / 原名 / lede / stats / cta / 标签 strip）
 *   .galvelica-meta         → 元信息（发行日 / 社团 / 平台 …）
 *   截图区                  → .galvelica-shots（.galvelica-shot，16:9）
 *   制作组                  → .galvelica-staff
 *   姊妹作                  → .galvelica-siblings（3:4）
 *   推荐 / 相关             → .galvelica-grid-2（双列条目）
 *
 * 旧骨架只画了「2/3/4 列 + aspect-[3/4]」6 个卡片，与详情页完全不符（加载完会大幅跳版）。
 * 本版按上述真实区块逐段还原，容器/单元一律复用语义类，列数与断点跟随 CSS 自动同步。
 */
export default function Loading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* ① 头部：封面卡 + 主信息 */}
      <div className="galvelica-detail-head">
        {/* 左：封面卡 */}
        <div className="galvelica-detail-card">
          <div className="aspect-[3/4] w-full animate-pulse rounded bg-muted" />
          <div className="galvelica-archive">
            <div className="galvelica-archive-row">
              <div className="h-3 w-8 animate-pulse rounded bg-muted" />
              <div className="h-3 w-10 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>

        {/* 右：标题 / 原名 / lede / stats / cta / 标签 */}
        <div className="galvelica-detail-main">
          <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="galvelica-detail-stats">
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="galvelica-detail-cta">
            <div className="h-10 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="galvelica-strip galvelica-detail-tags">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="galvelica-strip-item">
                <div className="h-4 animate-pulse rounded bg-muted" style={{ width: `${48 + i * 12}px` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ② 元信息 */}
      <div className="galvelica-meta">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="galvelica-meta-item">
            <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* ③ 截图区（16:9） */}
      <section className="galvelica-detail-section">
        <div className="galvelica-shots">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="galvelica-shot">
              <div className="aspect-[16/9] w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>

      {/* ④ 姊妹作（3:4） */}
      <section className="galvelica-detail-section">
        <div className="galvelica-siblings">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="galvelica-sibling">
              <div className="aspect-[3/4] w-full animate-pulse rounded bg-muted" />
              <div className="mt-1.5 h-3.5 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>

      {/* ⑤ 推荐 / 相关（双列条目） */}
      <section className="galvelica-detail-section">
        <div className="galvelica-grid-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="galvelica-entry">
              <div className="min-h-[72px] animate-pulse bg-muted" />
              <div className="aspect-[3/4] w-[62px] animate-pulse bg-muted" />
              <div className="min-w-0 space-y-2">
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-4 w-10 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
