"use client"

import { useRouter } from "next/navigation"
import { GameCard, type GameCardData } from "@/components/game-card"

/**
 * 继续浏览：展示服务端按当前登录用户记录的浏览历史（真正的「每个人各自的浏览历史」）。
 * 数据由发现页服务端查询后传入，组件本身不读 localStorage（localStorage 是设备级、无法区分用户）。
 */
export function RecentlyViewed({ initialCards = [] }: { initialCards?: GameCardData[] }) {
  const router = useRouter()

  async function handleClear() {
    await fetch("/api/history", { method: "DELETE" }).catch(() => {})
    router.refresh()
  }

  if (initialCards.length === 0) {
    return <p className="text-sm text-muted-foreground">登录后，你最近看过的作品会出现在这里。</p>
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          清空浏览记录
        </button>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20"
        style={{ contain: "layout style" }}
      >
        {initialCards.map((g) => (
          <div key={g.id} className="w-[140px] sm:w-[160px] shrink-0">
            {/* 继续浏览只保留封面 + 名称 + 数据行（访问量等），不再堆标签 */}
            <GameCard game={g} showTags={false} />
          </div>
        ))}
      </div>
    </div>
  )
}
