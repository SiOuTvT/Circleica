"use client"

import { cn } from "@/lib/utils"
import { TagGroupWithTags } from "@/types/tags-browser"
import Link from "next/link"
import { useState } from "react"

interface TagCategoryProps {
  group: TagGroupWithTags
}

/**
 * 分类标签卡片
 * 展示单个标签组的标签，支持展开/收起
 */
export function TagCategory({ group }: TagCategoryProps) {
  const [expanded, setExpanded] = useState(false)
  const displayTags = expanded ? group.tags : group.tags.slice(0, 8)

  return (
    <div
      className="bg-card rounded-xl p-4 ring-1 ring-border"
      style={{ borderTopColor: group.color, borderTopWidth: "3px" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: group.color }}
          />
          <h3 className="text-sm font-semibold text-foreground">
            {group.name}
          </h3>
        </div>
        {group.tags.length > 8 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? "收起" : `展开 (${group.tags.length})`}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {displayTags.map((tag) => (
          <Link
            key={tag.id}
            href={`/search?tag=${encodeURIComponent(tag.name)}`}
            className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-all hover:scale-105 hover:shadow-sm"
            style={{
              backgroundColor: `${tag.color}18`,
              color: tag.color,
              border: `1px solid ${tag.color}30`,
            }}
            title={`${tag.gameCount} 个游戏`}
          >
            {tag.name}
            <span className="ml-1 text-[10px] opacity-60">
              {tag.gameCount}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}