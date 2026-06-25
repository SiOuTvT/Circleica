"use client"

import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

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
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // click-outside 关闭
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  function buildHref(sortKey: string) {
    const p = new URLSearchParams(extraParams)
    if (sortKey !== "newest") p.set("sort", sortKey)
    else p.delete("sort")
    const s = p.toString()
    return `${basePath}${s ? `?${s}` : ""}`
  }

  const currentLabel = options.find(o => o.key === currentSort)?.label ?? "排序"

  return (
    <div ref={dropdownRef} className="sm:hidden relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg px-3 py-2.5 text-sm text-muted-foreground bg-muted cursor-pointer"
      >
        {currentLabel}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-32 overflow-hidden rounded-lg py-1 shadow-lg bg-card border border-border">
          {options.map(({ key, label }) => (
            <Link
              key={key}
              href={buildHref(key)}
              onClick={() => setOpen(false)}
              className={[
                "flex items-center px-3 py-2.5 text-sm transition-colors",
                currentSort === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
