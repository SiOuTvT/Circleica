export default function UserProfileLoading() {
  return (
    <div className="flex flex-col">
      <div className="flex lg:flex-row flex-col items-stretch min-w-0 gap-4 lg:gap-0 flex-1">
        {/* 左侧：用户信息骨架 */}
        <aside className="w-full lg:w-[380px] lg:shrink-0 min-w-0 order-1 lg:order-none">
          <div className="flex flex-col gap-4">
            {/* 主卡片 */}
            <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
              {/* Banner 骨架 */}
              <div className="h-36 w-full animate-pulse bg-muted" />
              <div className="px-6 py-8 flex flex-col items-center text-center">
                {/* 头像骨架 */}
                <div className="-mt-16 sm:-mt-22 mb-4 sm:mb-5">
                  <div className="h-[100px] w-[100px] sm:h-[130px] sm:w-[130px] rounded-full animate-pulse bg-muted" />
                </div>
                {/* 用户名 */}
                <div className="h-6 w-32 mx-auto rounded animate-pulse bg-muted mb-2" />
                <div className="h-4 w-20 mx-auto rounded animate-pulse bg-muted mb-4" />
                {/* Bio */}
                <div className="space-y-1.5 w-full max-w-xs">
                  <div className="h-3 w-full rounded animate-pulse bg-muted" />
                  <div className="h-3 w-3/4 mx-auto rounded animate-pulse bg-muted" />
                </div>
                {/* 统计数字 */}
                <div className="flex gap-6 mt-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="h-5 w-8 rounded animate-pulse bg-muted" />
                      <div className="h-3 w-10 rounded animate-pulse bg-muted" />
                    </div>
                  ))}
                </div>
                {/* 按钮 */}
                <div className="flex gap-2 mt-6">
                  <div className="h-9 w-24 rounded-lg animate-pulse bg-muted" />
                  <div className="h-9 w-9 rounded-lg animate-pulse bg-muted" />
                </div>
              </div>
            </div>
            {/* 活动统计卡片 */}
            <div className="rounded-2xl bg-card ring-1 ring-border p-5">
              <div className="h-4 w-20 rounded animate-pulse bg-muted mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-3 w-16 rounded animate-pulse bg-muted" />
                    <div className="h-3 w-8 rounded animate-pulse bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* 右侧：内容区骨架 */}
        <main className="w-full lg:w-[calc(100%-396px)] lg:shrink-0 flex flex-col lg:ml-4 min-w-0 order-2 lg:order-none">
          <div className="rounded-2xl bg-card ring-1 ring-border h-full p-5">
            {/* Tab 骨架 */}
            <div className="flex gap-2 mb-6">
              {["w-16", "w-12", "w-16"].map((w, i) => (
                <div key={i} className={`h-9 ${w} rounded-lg animate-pulse bg-muted`} />
              ))}
            </div>
            {/* 卡片网格骨架 */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="w-full aspect-[3/4] rounded-xl animate-pulse bg-muted" />
                  <div className="h-3 w-3/4 rounded animate-pulse bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
