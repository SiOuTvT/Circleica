"use client"

import type { GalvelicaWorkCard } from "@/lib/galvelica"
import { GalvelicaEntryRow } from "./galvelica-entry-row"

export function WorkGrid({ works, priorityCount = 0, showTags = true, desc = false }: { works: GalvelicaWorkCard[]; priorityCount?: number; showTags?: boolean; tagColor?: string; desc?: boolean }) {
  if (!works.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">暂无收录的作品。</p>
  }
  return (
    <div className="galvelica-grid-2">
      {works.map((w, i) => (
        <GalvelicaEntryRow key={w.id} work={w} priority={i < priorityCount} showTags={showTags} desc={desc} />
      ))}
    </div>
  )
}
