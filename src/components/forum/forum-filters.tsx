"use client"

import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

const CATEGORIES = [
  { value: "discussion", label: "讨论", icon: "💬" },
  { value: "help", label: "求档", icon: "🔍" },
  { value: "resource", label: "资源", icon: "📦" },
  { value: "offtopic", label: "杂谈", icon: "☕" },
]

interface ForumFiltersProps {
  searchQuery: string
  activeCategory: string
  onSearchChange: (query: string) => void
  onCategoryChange: (category: string) => void
}

export function ForumFilters({
  searchQuery,
  activeCategory,
  onSearchChange,
  onCategoryChange,
}: ForumFiltersProps) {
  return (
    <div className="mb-4 space-y-3">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索帖子标题或内容…"
          className="w-full rounded-xl bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all"
        />
      </div>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onCategoryChange("")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1",
            !activeCategory ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:text-foreground"
          )}
        >
          全部
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1",
              activeCategory === cat.value ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:text-foreground"
            )}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}