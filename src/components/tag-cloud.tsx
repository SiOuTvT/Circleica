"use client"

import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

type Tag = { id: string; name: string; color: string }

export function TagCloud({
  tags,
  activeTag,
  basePath,
}: {
  tags: Tag[]
  activeTag: string
  basePath: string
}) {
  const [expanded, setExpanded] = useState(false)
  const searchParams = useSearchParams()

  const buildHref = useMemo(() => {
    return (tagName: string) => {
      const p = new URLSearchParams(searchParams.toString())
      if (tagName) {
        p.set("tag", tagName)
      } else {
        p.delete("tag")
      }
      const s = p.toString()
      return `${basePath}${s ? `?${s}` : ""}`
    }
  }, [searchParams, basePath])

  const VISIBLE_COUNT = 10
  const visibleTags = expanded ? tags : tags.slice(0, VISIBLE_COUNT)

  /** 生成标签样式 - 使用 CSS 变量实现动态颜色 */
  const getTagStyle = (color: string, isActive: boolean): React.CSSProperties => ({
    '--tag-color': color,
    color: color,
    background: isActive ? `${color}20` : `${color}10`,
    borderColor: isActive ? color : `${color}30`,
  } as React.CSSProperties)

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildHref("")}
          className={[
            "inline-flex items-center rounded-full px-3 py-2 text-sm font-medium transition-all ring-1",
            !activeTag
              ? "bg-primary/15 text-primary ring-primary/20"
              : "bg-muted text-muted-foreground ring-border hover:bg-accent hover:text-foreground",
          ].join(" ")}
        >
          全部
        </Link>
        {visibleTags.map((t) => (
          <Link
            key={t.id}
            href={buildHref(t.name)}
            className={[
              "inline-flex items-center rounded-full px-3 py-2 text-sm font-medium transition-all ring-1",
              activeTag === t.name ? "opacity-100" : "opacity-50 hover:opacity-80",
            ].join(" ")}
            style={getTagStyle(t.color, activeTag === t.name)}
          >
            {t.name}
          </Link>
        ))}
      </div>
      {tags.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="mt-2 flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "收起" : `展开全部 (${tags.length})`}
          <ChevronDown
            className="h-3 w-3 transition-transform duration-200"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      )}
    </div>
  )
}
