"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"

export interface GalvelicaFilterItem {
  href: string
  /** 主显示名（同时参与匹配） */
  label: string
  /** 右侧计数 */
  count?: number
  /** 追加显示并参与匹配的文本（如年份的「预定」、原文 / 别名） */
  alt?: string
}

/** 大小写与全半角不敏感：NFKC 把全角折成半角，再统一小写 */
function norm(s: string): string {
  return s.trim().toLowerCase().normalize("NFKC")
}

/**
 * 索引页页内过滤框：纯前端子串匹配，不查库、不发请求。
 * 只有这一个组件是 client component；三个索引页本身仍是 server component，
 * 服务端的数据获取 / 排序 / 分页逻辑完全不动。
 */
export function GalvelicaIndexFilter({
  items,
  placeholder,
  variant,
  numericPrefix = false,
  listClassName,
  paged,
}: {
  items: GalvelicaFilterItem[]
  placeholder: string
  variant: "strip" | "year" | "studio"
  /** 年份页：额外支持数字前缀匹配（如输入 201 命中 2010 起所有年份） */
  numericPrefix?: boolean
  /** 列表容器附加类名（供页面做作用域样式） */
  listClassName?: string
  /** 分页页专用：过滤只作用于当前页。仅由"总页数 > 1"的页面传入；
   *  传入后空态文案改为"本页 N 项中没有匹配项"、命中文案带"（仅筛选本页）"，
   *  并在框下方常驻一行作用域说明。标签 / 年份页不分页，不传。 */
  paged?: { page: number; perPage: number }
}) {
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const k = norm(q)
    if (!k) return items
    return items.filter((it) => {
      const label = norm(String(it.label))
      if (numericPrefix && label.startsWith(k)) return true
      return norm(`${String(it.label)} ${it.alt ?? ""}`).includes(k)
    })
  }, [items, q, numericPrefix])

  const hint = q.trim()
    ? filtered.length === 0
      ? paged
        ? `本页 ${paged.perPage} 项中没有匹配项`
        : `没有匹配项 当前 ${items.length} 项中筛出 0 项`
      : paged
        ? `当前 ${items.length} 项中筛出 ${filtered.length} 项（仅筛选本页）`
        : `当前 ${items.length} 项中筛出 ${filtered.length} 项`
    : null

  return (
    <div className="galvelica-index-filter">
      <div className="field">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full min-w-0 min-h-[40px] rounded-none border border-input bg-card py-2 pl-8 pr-3 galvelica-fs-meta text-foreground placeholder:text-muted-foreground/70 focus:border-[var(--gal-accent)] focus:outline-none"
          />
        </div>
        {paged && (
          <p className="mt-2 galvelica-fs-meta text-muted-foreground">
            仅筛选本页（第 {paged.page} 页 {paged.perPage} 项）
          </p>
        )}
        {hint && (
          <p className="mt-2 galvelica-fs-meta text-muted-foreground" aria-live="polite">
            {hint}
          </p>
        )}
      </div>

      <div className={listClassName ? `list ${listClassName}` : "list"}>
        {variant === "strip" && (
          <div className="galvelica-strip">
            {filtered.map((it) => (
              <Link key={it.href} href={it.href} className="galvelica-strip-item">
                <b>{it.label}</b>
                {typeof it.count === "number" && <i>{it.count}</i>}
              </Link>
            ))}
          </div>
        )}

        {variant === "year" && (
          <div className="galvelica-year-grid">
            {filtered.map((it) => (
              <Link key={it.href} href={it.href} className="galvelica-index-card galvelica-year-cell">
                <span className="galvelica-year-year">
                  {it.label}
                  {it.alt ? ` ${it.alt}` : ""}
                </span>
                <span className="galvelica-year-count">{it.count} 部</span>
              </Link>
            ))}
          </div>
        )}

        {variant === "studio" && (
          <div className="galvelica-studios-grid">
            {filtered.map((it) => (
              <Link key={it.href} href={it.href} className="galvelica-entry galvelica-entry-text">
                <span className="galvelica-entry-spine" aria-hidden />
                <span className="galvelica-entry-title">{it.label}</span>
                <span className="galvelica-entry-side">
                  <span className="galvelica-fs-meta text-muted-foreground tabular-nums">{it.count} 部</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
