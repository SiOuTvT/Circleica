"use client"

import { useState } from "react"
import { TagCard } from "@/components/archive/tag-card"

type TagCardTag = React.ComponentProps<typeof TagCard>["tag"]

/**
 * A–Z 字母分组：默认只渲染前 12 个 + 「展开全部 (N)」。
 * 窄屏专期：258 个标签一次性铺开会让 /credits/tag 在 390 下长达 12 屏。
 */
export function AzTagGroup({
  letter,
  tags,
  gridClass,
  anchorId,
  initialCount = 12,
}: {
  letter: string
  tags: TagCardTag[]
  gridClass: string
  anchorId: string
  initialCount?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? tags : tags.slice(0, initialCount)

  return (
    <div id={anchorId} className="scroll-mt-20">
      <div className="mb-3 flex items-baseline gap-2 border-b border-border/50 pb-1.5">
        <span className="text-sm font-bold text-foreground">{letter}</span>
        <span className="text-xs text-muted-foreground/60">{tags.length} 个标签</span>
      </div>
      <div className={gridClass}>
        {shown.map((tag) => (
          <TagCard key={tag.id} tag={tag} />
        ))}
      </div>
      {tags.length > initialCount && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center min-h-[32px] px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "收起" : `展开全部 (${tags.length})`}
        </button>
      )}
    </div>
  )
}
