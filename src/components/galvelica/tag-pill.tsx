import { Tag } from "@/components/ui/tag"
import type { GalvelicaTag } from "@/lib/galvelica"

interface TagPillProps {
  tag: GalvelicaTag
  showCount?: boolean
  /** 统一配色（副站全局标签色）。传入时覆盖 tag.color，实现「所有标签同色」。 */
  color?: string
}

export function TagPill({ tag, showCount, color }: TagPillProps) {
  return (
    <Tag
      variant="cloud"
      color={color ?? tag.color}
      href={`/galvelica/tags/${tag.id}`}
      title={tag.groupName ? `${tag.groupName} · ${tag.name}` : tag.name}
    >
      {tag.name}
      {showCount && typeof tag.count === "number" && (
        <span className="opacity-60 tabular-nums">{tag.count}</span>
      )}
    </Tag>
  )
}

export function TagCloud({
  tags,
  showCount = true,
  color,
}: {
  tags: GalvelicaTag[]
  showCount?: boolean
  /** 统一配色（副站全局标签色）。传入时所有标签同色。 */
  color?: string
}) {
  if (!tags.length) return <p className="py-8 text-center text-sm text-muted-foreground">暂无标签。</p>
  return (
    <div className="flex flex-wrap gap-2 sm:gap-2.5">
      {tags.map((t) => (
        <TagPill key={t.id} tag={t} showCount={showCount} color={color} />
      ))}
    </div>
  )
}
