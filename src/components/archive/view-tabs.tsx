"use client"

import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export type ArchiveView = "works" | "name"

const TABS: { key: ArchiveView; label: string }[] = [
  { key: "works", label: "按作品" },
  { key: "name", label: "按首字" },
]

/**
 * 图鉴页「按作品 / 按首字」视图切换（胶囊按钮，与论坛分类按钮同款）。
 *
 * 状态写进 URL ?view=：不带参数时默认「按作品」，故选中「按作品」时删除该参数以保持链接干净；
 * 分享带 ?view=name 的链接会直接落在「按首字」（参数名与取值保持不变，既有分享链接不失效）。
 * 切换走 router.replace（App Router 软导航，不整页刷新），列表由 client 组件按新参数重新取数，
 * 取数期间列表区显示骨架屏（旧视图内容不闪回）。
 * 切换时保留 q / sort 等既有参数，不互相清掉。
 *
 * 位置：由两页塞进 ArchiveHero 的 search 槽位，与搜索框同一行、紧贴其右侧 12px，
 * 垂直以搜索框为基准居中；不改搜索框 448px 宽度上限，也不被甩到行最右端。
 * 根节点 shrink-0：自身永不被压扁；外层 flex-wrap 时整组一起换到下一行，
 * 不会出现「一个 tab 在上行、一个在下行」或 tab 内文字换行。
 */
export function ViewTabs({ view }: { view: ArchiveView }) {
  const router = useRouter()
  const pathname = usePathname()

  const update = (next: ArchiveView) => {
    if (next === view) return
    const params = new URLSearchParams(window.location.search)
    if (next === "works") params.delete("view")
    else params.set("view", next)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => update(t.key)}
          data-ripple
          aria-pressed={view === t.key}
          className={cn(
            "min-h-[36px] whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-medium ring-1 transition duration-150 ease-in-out",
            view === t.key
              ? "bg-primary/10 text-primary ring-primary/40"
              : "bg-transparent text-muted-foreground ring-border hover:bg-muted/50 hover:text-foreground",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
