import { GameCardSkeleton } from "@/components/game-card"

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
