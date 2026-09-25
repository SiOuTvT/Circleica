import { GameCardSlot } from "@/components/game-card"

// ─────────────────────────────────────────────────────────────
// 首页专属骨架。必须放在 (home) 路由组内，不能放回 src/app/loading.tsx。
//
// 理由：这份骨架画的是首页布局（公告 + 数据行 + 动态 + 游戏网格）。若放在根级 src/app/loading.tsx，
// 它会成为**全站**的 Suspense fallback —— 所有没有自己 loading.tsx 的页面在加载时都会闪一下
// 首页骨架，包括 Archive 列表页，直接违反四页同源。收进 (home) 后作用域被限定在首页自身。
//
// 结构对齐 HomeAnnounceBar（src/components/home-announce-bar.tsx）：
//   ≥lg 两列：左列 flex-[3]（公告卡 clamp(220,30vh,280) → 控制行 → 数据行），右列 w-[35%]（动态列表）
//   <lg 纵向堆叠。首页没有独立的「品牌卡」，骨架同步去掉该区块。
// ─────────────────────────────────────────────────────────────

export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-5 pt-4 sm:gap-7">
      <h1 className="sr-only">资源大厅</h1>

      {/* ── 公告 + 数据行 + 动态：对齐 HomeAnnounceBar ── */}
      <div className="flex flex-col lg:flex-row lg:gap-5">
        {/* 左列：公告卡 → 控制行 → 数据行（gap-4 与实际一致） */}
        <div className="flex min-w-0 flex-col gap-4 lg:flex-[3]">
          {/* 公告卡占位：高度与实际 clamp(220px, 30vh, 280px) 一致 */}
          <div
            className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-border"
            style={{ height: "clamp(220px, 30vh, 280px)" }}
          >
            <div className="absolute inset-0 skeleton-shimmer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {/* 底部毛玻璃内容区占位（头像+名字 / 标题 / 摘要 三层） */}
            <div className="absolute inset-x-0 bottom-0 z-[2] p-5 sm:p-6">
              <div className="space-y-2.5 rounded-xl bg-black/20 px-5 py-3.5 backdrop-blur-md sm:px-6 sm:py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-full skeleton-shimmer" />
                  <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                  <div className="h-3 w-16 rounded skeleton-shimmer" />
                </div>
                <div className="h-6 w-2/3 rounded skeleton-shimmer sm:h-7" />
                <div className="hidden h-3.5 w-1/2 rounded skeleton-shimmer sm:block" />
              </div>
            </div>
          </div>

          {/* 控制行占位：圆点居中、两侧箭头（≥sm 显示） */}
          <div className="mt-2.5 flex items-center justify-between">
            <div className="hidden h-8 w-8 rounded-full bg-foreground/5 ring-1 ring-foreground/15 sm:block" />
            <div className="mx-auto flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full ${i === 0 ? "w-4 bg-foreground/25" : "w-1.5 bg-foreground/15"}`}
                />
              ))}
            </div>
            <div className="hidden h-8 w-8 rounded-full bg-foreground/5 ring-1 ring-foreground/15 sm:block" />
          </div>

          {/* 数据行占位：与统计块同构（px-3.5 py-2、数字 text-2xl、label mt-1.5） */}
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`flex-1 rounded-xl px-3.5 py-2 text-center ${
                  i === 2
                    ? "border border-dashed border-border/40 bg-card/50"
                    : "border border-border bg-card shadow-sm"
                }`}
              >
                <div className="mx-auto h-7 w-14 rounded skeleton-shimmer" />
                <div className="mx-auto mt-1.5 h-3 w-10 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>

        {/* 右列：动态列表（<md 隐藏，与实际一致） */}
        <div className="relative hidden shrink-0 self-stretch md:block lg:w-[35%]">
          <div className="space-y-3.5 rounded-2xl border border-border/15 bg-muted/15 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full skeleton-shimmer" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded skeleton-shimmer" />
                  <div className="h-3 w-1/3 rounded skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 最新资源标题行 ── */}
      <div className="flex items-center gap-4 py-2">
        <div className="h-7 w-28 rounded skeleton-shimmer" />
        <div className="h-4 w-10 rounded skeleton-shimmer" />
      </div>

      {/* ── 游戏网格占位：12 格常驻空槽（结构恒定，加载前后不跳），
              列数与 15-C 定案一致：2 → sm:3 → lg:4 ── */}
      <section>
        <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <GameCardSlot key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
