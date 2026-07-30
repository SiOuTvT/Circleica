"use client"

import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

/**
 * 页头排序切换：点击写入 URL ?sort=（作品数 / 名称），由服务端重新取数。
 * 用于制作组 / 创作者图鉴的 Server Component 页头，与精选合集的 HeaderSearch 同构（均走 URL）。
 */
export function SortTabs({ sort }: { sort: "count" | "name" }) {
  const router = useRouter()
  const pathname = usePathname()

  const update = (next: "count" | "name") => {
    if (next === sort) return
    const params = new URLSearchParams(window.location.search)
    if (next === "name") params.delete("sort")
    else params.set("sort", next)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5 text-xs ring-1 ring-border">
      <button
        onClick={() => update("count")}
        className={cn(
          "rounded-md px-2.5 py-1 transition-all",
          sort === "count" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        作品数
      </button>
      <button
        onClick={() => update("name")}
        className={cn(
          "rounded-md px-2.5 py-1 transition-all",
          sort === "name" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        名称
      </button>
    </div>
  )
}
