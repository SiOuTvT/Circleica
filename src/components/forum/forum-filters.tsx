"use client"

import { cn } from "@/lib/utils"
import { HelpCircle, MessageCircle, Package, Coffee, Search } from "lucide-react"
import type { ComponentType, SVGProps } from "react"

type IconType = ComponentType<SVGProps<SVGSVGElement>>

const CATEGORIES: { value: string; label: string; icon: IconType }[] = [
  { value: "discussion", label: "讨论", icon: MessageCircle },
  { value: "help", label: "求档", icon: HelpCircle },
  { value: "resource", label: "资源", icon: Package },
  { value: "offtopic", label: "杂谈", icon: Coffee },
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
      <div className="flex flex-wrap gap-1 sm:gap-1.5">
        <button
          onClick={() => onCategoryChange("")}
          className={cn(
            "rounded-lg px-3 py-2 text-xs font-medium transition-all ring-1 min-h-[36px]",
            !activeCategory ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:text-foreground"
          )}
        >
          全部
        </button>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={cn(
              "rounded-lg px-3 py-2 text-xs font-medium transition-all ring-1 min-h-[36px] flex items-center gap-1.5",
              activeCategory === cat.value ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} /> {cat.label}
          </button>
          )
        })}
      </div>
    </div>
  )
}