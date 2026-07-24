import Link from "next/link"
import type { GalvelicaTag } from "@/lib/galvelica"

interface TagPillProps {
  tag: GalvelicaTag
  showCount?: boolean
}

export function TagPill({ tag, showCount }: TagPillProps) {
  return (
    <Link
      href={`/galvelica/tags/${tag.id}`}
      className="galvelica-tag inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-transform hover:scale-[1.03]"
      title={tag.groupName ? `${tag.groupName} · ${tag.name}` : tag.name}
    >
      {tag.name}
      {showCount && typeof tag.count === "number" && (
        <span className="opacity-60 tabular-nums">{tag.count}</span>
      )}
    </Link>
  )
}

export function TagCloud({ tags, showCount = true }: { tags: GalvelicaTag[]; showCount?: boolean }) {
  if (!tags.length) return <p className="py-8 text-center text-sm text-muted-foreground">暂无标签。</p>
  return (
    <div className="flex flex-wrap gap-2 sm:gap-2.5">
      {tags.map((t) => (
        <TagPill key={t.id} tag={t} showCount={showCount} />
      ))}
    </div>
  )
}
