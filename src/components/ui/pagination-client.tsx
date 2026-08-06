"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

/**
 * Pagination 的交互子组件（Client）。
 * 必须包裹在 <Suspense> 内（useSearchParams 要求），由 server 端 Pagination 渲染时处理。
 * 两者都会保留当前其余 query 参数，仅更新 size / pageParam。
 */

const SIZES = [20, 50, 100] as const

export function PageSizeSelect({ pageSize = 20 }: { pageSize?: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      每页
      <select
        value={pageSize}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString())
          params.set("size", e.target.value)
          params.set("page", "1")
          router.push(`?${params.toString()}`)
        }}
        className="rounded-lg border border-border bg-transparent px-2 py-1 text-sm text-foreground outline-none transition-colors focus:border-[color:var(--admin-accent,var(--primary))]"
      >
        {SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      条
    </label>
  )
}

export function PageJump({
  pageParam = "page",
  currentPage = 1,
  totalPages = 1,
}: {
  pageParam?: string
  currentPage?: number
  totalPages?: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(String(currentPage))

  const go = () => {
    const n = Math.min(Math.max(1, parseInt(value || "1", 10) || 1), totalPages)
    const params = new URLSearchParams(searchParams.toString())
    params.set(pageParam, String(n))
    router.push(`?${params.toString()}`)
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      跳至
      <input
        type="number"
        min={1}
        max={totalPages}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") go()
        }}
        className="w-16 rounded-lg border border-border bg-transparent px-2 py-1 text-sm text-foreground outline-none transition-colors focus:border-[color:var(--admin-accent,var(--primary))]"
      />
      页
      <button
        type="button"
        onClick={go}
        className="rounded-lg border border-border px-2 py-1 text-xs text-foreground transition-colors hover:bg-accent"
      >
        Go
      </button>
    </span>
  )
}
