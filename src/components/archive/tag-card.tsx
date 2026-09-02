import Link from "next/link"
import { cn } from "@/lib/utils"
import type { TagWithGroup } from "@/types/tags-browser"

interface TagCardProps {
  tag: TagWithGroup
  className?: string
}

/**
 * TagCard — 标签索引卡（Archive 浏览体系，tag 变体）
 *
 * 轻量索引定位：小尺寸、高密度，色点 + 名称 + 数量 + 分组。
 * 不模拟实体 Hero / 大封面，与 Studio / Creator / Collection 展示卡明显区分。
 * 链接指向标签详情页 /credits/tag/[slug]；slug 缺失时回退旧路由 /tags/[id]。
 */
export function TagCard({ tag, className }: TagCardProps) {
  const color = tag.color || tag.group.color || "#6b7280"
  const href = tag.slug
    ? `/credits/tag/${encodeURIComponent(tag.slug)}`
    : `/tags/${tag.id}`
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5 ring-1 ring-border transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,transform-origin,filter,backdrop-filter] ease-in-out duration-200 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-sm",
        className,
      )}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
            {tag.name}
          </span>
          <span className="shrink-0 text-caption tabular-nums text-muted-foreground/70">
            {tag.gameCount}
          </span>
        </div>
        <p className="mt-1.5 truncate text-caption text-muted-foreground/60">{tag.group.name}</p>
      </div>
    </Link>
  )
}
