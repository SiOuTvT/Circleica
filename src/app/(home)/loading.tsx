import { GameCardSkeleton } from "@/components/game-card"

// ─────────────────────────────────────────────────────────────
// 首页专属骨架。必须放在 (home) 路由组内，不能放回 src/app/loading.tsx。
//
// 理由：这份骨架画的是首页布局（品牌卡 + 公告位 + 游戏网格）。若放在根级 src/app/loading.tsx，
// 它会成为**全站**的 Suspense fallback —— 所有没有自己 loading.tsx 的页面在加载时都会闪一下
// 首页骨架，包括 Archive 列表页，直接违反四页同源。收进 (home) 后作用域被限定在首页自身。
//
// （注：迁移前一度怀疑根级 loading 的 Suspense 边界会把页面内 redirect() 降级成软跳转，
//  但实测移除根级 loading 后 /register 等页面内 redirect 仍为 200 软跳转 —— 该降级源于流式
//  RSC 渲染本身，与根级 loading 无关。静态跳转已改由 next.config.ts redirects 与 proxy.ts 处理。）
//
// (home) 是路由组，不参与 URL 段，首页仍是 "/"，但骨架的作用域被收敛到首页自身。
// ─────────────────────────────────────────────────────────────

export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 pt-4">
      <h1 className="sr-only">资源大厅</h1>

      {/* Hero + 手机端随机按钮 — 与首页布局对齐 */}
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-5 items-start">
          {/* 品牌卡占位 - 桌面端 */}
          <div className="hidden md:flex rounded-2xl bg-card ring-1 ring-border overflow-hidden h-[310px] flex-col">
            <div className="flex flex-col flex-1 px-6 py-8 justify-between">
              <div>
                <div className="h-3 w-32 rounded skeleton-shimmer" />
                <div className="mt-3 h-9 w-44 rounded skeleton-shimmer" />
                <div className="mt-2 h-4 w-56 rounded skeleton-shimmer" />
              </div>
              <div className="flex gap-6">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <div className="h-8 w-12 rounded skeleton-shimmer" />
                    <div className="mt-1.5 h-4 w-16 rounded skeleton-shimmer" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-28 rounded-lg skeleton-shimmer" />
                <div className="h-9 w-28 rounded-lg skeleton-shimmer" />
              </div>
            </div>
          </div>

          {/* 公告区占位 */}
          <div className="relative w-full h-[200px] sm:h-[220px] lg:h-[310px] overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <div className="absolute inset-0 skeleton-shimmer" />
            <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3.5 left-3.5 right-3.5 flex flex-col gap-2">
              <div className="h-7 w-2/3 rounded-lg skeleton-shimmer" />
              <div className="h-4 w-1/2 rounded skeleton-shimmer" />
            </div>
          </div>
        </div>

        {/* 手机端：随机发现按钮占位 */}
        <div className="flex md:hidden gap-2">
          <div className="h-10 flex-1 rounded-lg skeleton-shimmer" />
          <div className="h-10 flex-1 rounded-lg skeleton-shimmer" />
        </div>
      </div>

      {/* 游戏网格占位 */}
      <section>
        <div className="mb-4 sm:mb-5">
          <div className="flex items-end justify-between border-b border-border pb-3">
            <div>
              <div className="mb-1 h-3 w-20 rounded skeleton-shimmer" />
              <div className="h-5 w-32 rounded skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
          {Array.from({ length: 12 }).map((_, i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  )
}
