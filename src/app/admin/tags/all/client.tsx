"use client"

import { ArrowLeft, Layers, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

interface TagItem {
  id: string
  name: string
  color: string
  gameCount: number
  isVisible: boolean
  groupName: string | null
  groupColor: string | null
}

export function AllTagsClient({ tags }: { tags: TagItem[] }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "count">("name")

  const filtered = useMemo(() => {
    let list = tags
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(q))
    }
    if (sortBy === "count") {
      list = [...list].sort((a, b) => b.gameCount - a.gameCount)
    }
    return list
  }, [tags, searchQuery, sortBy])

  // 按标签组分组统计
  const groupStats = useMemo(() => {
    const map = new Map<string, { name: string; color: string; count: number }>()
    for (const t of tags) {
      const key = t.groupName ?? "未分组"
      const color = t.groupColor ?? "#6b7280"
      const existing = map.get(key)
      if (existing) {
        existing.count++
      } else {
        map.set(key, { name: key, color, count: 1 })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [tags])

  return (
    <div className="space-y-6">
      {/* ── 顶部 ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/tags")}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border hover:ring-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">全部标签</h1>
          <span className="text-sm text-muted-foreground">{tags.length} 个</span>
        </div>
      </div>

      {/* ── 标签组分布 ── */}
      <div className="rounded-xl bg-card p-4 ring-1 ring-border">
        <p className="text-xs text-muted-foreground mb-3">标签组分布</p>
        <div className="flex flex-wrap gap-2">
          {groupStats.map((g) => (
            <span
              key={g.name}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1"
              style={{ color: g.color, background: `${g.color}15`, borderColor: `${g.color}30` }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.color }} />
              {g.name}
              <span className="opacity-60">{g.count}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── 搜索 + 排序 ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标签…" aria-label="搜索标签"
            className="rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring transition-all w-full"
          />
        </div>
        <div className="flex rounded-lg bg-secondary ring-1 ring-border overflow-hidden">
          <button
            type="button"
            aria-pressed={sortBy === "name"}
            onClick={() => setSortBy("name")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              sortBy === "name" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            默认
          </button>
          <button
            type="button"
            aria-pressed={sortBy === "count"}
            onClick={() => setSortBy("count")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              sortBy === "count" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            数量
          </button>
        </div>
      </div>

      {/* ── 标签列表 ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-center ring-1 ring-border">
          <p className="text-sm text-muted-foreground">没有找到匹配的标签</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-border overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((tag) => (
              <div
                key={tag.id}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors ${tag.isVisible ? "" : "opacity-50"}`}
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: tag.color }} />
                <span className="flex-1 text-sm text-foreground truncate">{tag.name}</span>
                {!tag.isVisible && (
                  <span className="shrink-0 text-[10px] text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">隐藏</span>
                )}
                {tag.groupName && (
                  <span
                    className="shrink-0 text-[10px] rounded-full px-1.5 py-0.5 font-medium"
                    style={{ color: tag.groupColor ?? "#6b7280", background: `${tag.groupColor ?? "#6b7280"}15` }}
                  >
                    {tag.groupName}
                  </span>
                )}
                <span className="shrink-0 text-xs tabular-nums font-medium text-muted-foreground min-w-[2rem] text-right">
                  {tag.gameCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
