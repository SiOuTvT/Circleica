import Link from "next/link"
import type { GalvelicaTag } from "@/lib/galvelica"

interface TagPillProps {
  tag: GalvelicaTag
  showCount?: boolean
  /** 统一配色（副站全局标签色）。传入时所有标签同色。 */
  color?: string
}

export function TagPill({ tag, showCount }: TagPillProps) {
  return (
    <Link
      href={`/galvelica/tags/${tag.id}`}
      title={tag.groupName ? `${tag.groupName}：${tag.name}` : tag.name}
      className="galvelica-tagflat"
    >
      {tag.name}
      {showCount && typeof tag.count === "number" && <i>{tag.count}</i>}
    </Link>
  )
}

export function TagCloud({
  tags,
  showCount = true,
  color,
}: {
  tags: GalvelicaTag[]
  showCount?: boolean
  color?: string
}) {
  if (!tags.length) return <p className="py-8 text-center text-sm text-muted-foreground">暂无标签。</p>
  return (
    <div className="galvelica-tagcloud">
      {tags.map((t) => (
        <TagPill key={t.id} tag={t} showCount={showCount} color={color} />
      ))}
    </div>
  )
}
