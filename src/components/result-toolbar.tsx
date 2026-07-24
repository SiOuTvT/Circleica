"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, LayoutGrid, List, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SortOptionItem {
  key: string
  label: string
}

/** 全站统一的游戏排序选项（纯数据，可安全在 server→client 间传递） */
export const GAME_SORT_OPTIONS: SortOptionItem[] = [
  { key: "newest", label: "最新" },
  { key: "popular", label: "最热" },
  { key: "mostFaved", label: "最多收藏" },
]

export interface ActiveFilter {
  key: string
  label: string
  basePath: string
  /** 移除该筛选后应保留的 URL 参数（不含 page，清除即回到第 1 页） */
  clearParams: Record<string, string>
}

interface ResultToolbarProps {
  /** 结果总数，用于计数展示 */
  total?: number
  /** 结果标签，如「搜索结果」「全部游戏」 */
  resultLabel?: string
  /** 当前排序 key */
  sort: string
  sortOptions?: SortOptionItem[]
  /** 结果页基路径，如 "/search" 或 "/" */
  basePath: string
  /** 除 sort/view 外的当前 URL 参数（q/tag/nsfw 等），切换排序/视图时保留 */
  params?: Record<string, string>
  defaultSort?: string
  /** 当前视图；传入即启用网格/列表切换 */
  view?: "grid" | "list"
  defaultView?: "grid" | "list"
  /** 可移除的筛选 chips */
  activeFilters?: ActiveFilter[]
  /** 是否吸顶 */
  sticky?: boolean
  className?: string
}

function buildHref(basePath: string, params: Record<string, string>, overrides: Record<string, string>): string {
  const p = new URLSearchParams(params)
  Object.entries(overrides).forEach(([k, v]) => {
    if (v) p.set(k, v)
    else p.delete(k)
  })
  const s = p.toString()
  return `${basePath}${s ? `?${s}` : ""}`
}

/**
 * 统一结果页工具栏：排序下拉 + 网格/列表视图切换 + 结果计数 + 可移除筛选 chips。
 * 设计为纯数据驱动（仅接收 URL 参数），可在 server component 中直接渲染。
 */
export function ResultToolbar({
  total,
  resultLabel,
  sort,
  sortOptions = GAME_SORT_OPTIONS,
  basePath,
  params = {},
  defaultSort = "newest",
  view,
  defaultView = "grid",
  activeFilters = [],
  sticky = false,
  className,
}: ResultToolbarProps) {
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sortOpen) return
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [sortOpen])

  const currentSortLabel = sortOptions.find((o) => o.key === sort)?.label ?? "排序"
  const buildSortHref = (key: string) =>
    buildHref(basePath, params, { sort: key === defaultSort ? "" : key, page: "" })
  const buildViewHref = (v: "grid" | "list") =>
    buildHref(basePath, params, { view: v === defaultView ? "" : v, page: "" })

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl",
        sticky &&
          "sticky top-2 z-30 bg-background/80 px-3 py-2 ring-1 ring-border backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      {/* 左：筛选 chips + 计数 */}
      <div className="flex min-w-0 items-center gap-2">
        {activeFilters.map((f) => (
          <Link
            key={f.key}
            href={buildHref(f.basePath, f.clearParams, {})}
            className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted/70"
          >
            {f.label}
            <X className="h-3 w-3 text-muted-foreground" strokeWidth={2} />
          </Link>
        ))}
        {total != null && (
          <span className="truncate text-sm text-muted-foreground tabular-nums">
            {resultLabel ? `${resultLabel} · ` : ""}
            {total} 个
          </span>
        )}
      </div>

      {/* 右：视图切换 + 排序 */}
      <div className="flex shrink-0 items-center gap-2">
        {view && (
          <div className="flex items-center rounded-lg bg-muted p-0.5">
            <Link
              href={buildViewHref("grid")}
              aria-label="网格视图"
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Link
              href={buildViewHref("list")}
              aria-label="列表视图"
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        )}

        <div ref={sortRef} className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {currentSortLabel}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", sortOpen && "rotate-180")} strokeWidth={1.5} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-3">
              {sortOptions.map((o) => (
                <Link
                  key={o.key}
                  href={buildSortHref(o.key)}
                  onClick={() => setSortOpen(false)}
                  className={cn(
                    "block px-3 py-2 text-sm transition-colors",
                    sort === o.key ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
