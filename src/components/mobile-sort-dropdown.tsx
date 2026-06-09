"use client"

import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"

interface SortOption {
  key: string
  label: string
}

export function MobileSortDropdown({
  currentSort,
  options,
  basePath,
  extraParams,
}: {
  currentSort: string
  options: SortOption[]
  basePath: string
  extraParams?: Record<string, string>
}) {
  function buildHref(sortKey: string) {
    const p = new URLSearchParams(extraParams)
    if (sortKey !== "newest") p.set("sort", sortKey)
    else p.delete("sort")
    const s = p.toString()
    return `${basePath}${s ? `?${s}` : ""}`
  }
  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const details = detailsRef.current
    if (!details) return

    const handleClickOutside = (e: MouseEvent) => {
      if (details.open && !details.contains(e.target as Node)) {
        details.open = false
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  const currentLabel = options.find(o => o.key === currentSort)?.label ?? "排序"

  return (
    <details ref={detailsRef} className="sm:hidden relative">
      <summary className="flex items-center gap-1 rounded-lg px-3 py-2.5 text-sm text-muted-foreground bg-muted cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {currentLabel}
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
      </summary>
      <div className="absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-lg py-1 shadow-lg bg-card border border-border">
        {options.map(({ key, label }) => (
          <Link
            key={key}
            href={buildHref(key)}
            className={[
              "flex items-center px-3 py-2.5 text-sm transition-colors",
              currentSort === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>
    </details>
  )
}
