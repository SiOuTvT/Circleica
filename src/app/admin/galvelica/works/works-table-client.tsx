"use client"

import { useState } from "react"
import { WorkRowActions } from "./work-actions"
import { WorkBatchActions } from "./batch-actions"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"

export interface WorkRow {
  id: string
  title: string
  studioName: string | null
  releaseDate: string | null
  status: string | null
  isNsfw: boolean
  gameId: string | null
  viewCount?: number
  slug?: string
}

export function WorksTableClient({ works }: { works: WorkRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === works.length ? new Set() : new Set(works.map((w) => w.id))))
  }

  const allChecked = works.length > 0 && selected.size === works.length

  return (
    <div className="space-y-3">
      <WorkBatchActions selected={selected} onClear={() => setSelected(new Set())} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          className="h-4 w-4"
          aria-label="全选本页"
        />
        <span>
          全选本页（{selected.size}/{works.length}）
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {works.map((w) => (
          <div
            key={w.id}
            className="flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-[color:var(--admin-accent,var(--primary))]"
          >
            <div className="mb-3 flex items-start gap-2">
              <input
                type="checkbox"
                checked={selected.has(w.id)}
                onChange={() => toggle(w.id)}
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-label={`选择 ${w.title}`}
              />
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                {w.title.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground" title={w.title}>
                  {w.title}
                </p>
              </div>
              {w.isNsfw && <AdminStatusBadge tone="danger">NSFW</AdminStatusBadge>}
            </div>

            <dl className="space-y-1 text-xs text-muted-foreground">
              <div className="flex gap-1">
                <dt className="shrink-0">制作组</dt>
                <dd className="truncate">{w.studioName || "—"}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="shrink-0">发售日</dt>
                <dd>{w.releaseDate ? new Date(w.releaseDate).toLocaleDateString("zh-CN") : "—"}</dd>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span>状态：{w.status || "—"}</span>
                {w.gameId ? <AdminStatusBadge tone="success">已收录</AdminStatusBadge> : null}
              </div>
              <div>浏览：{w.viewCount ?? 0}</div>
            </dl>

            <div className="mt-3 border-t border-border pt-3">
              <WorkRowActions work={w} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
