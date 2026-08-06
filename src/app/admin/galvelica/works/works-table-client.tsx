"use client"

import { useState } from "react"
import { WorkRowActions } from "./work-actions"
import { WorkBatchActions } from "./batch-actions"
import { Layers } from "lucide-react"

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
      <WorkBatchActions selected={selected} />

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4" aria-label="全选" />
              </th>
              <th className="px-4 py-3 text-left font-medium">标题</th>
              <th className="px-4 py-3 text-left font-medium">制作组</th>
              <th className="px-4 py-3 text-left font-medium">发售日</th>
              <th className="px-4 py-3 text-left font-medium">状态</th>
              <th className="px-4 py-3 text-right font-medium">浏览</th>
              <th className="px-4 py-3 text-center font-medium">收录</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {works.map((w) => (
              <tr key={w.id} className="transition-colors hover:bg-accent/30">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(w.id)}
                    onChange={() => toggle(w.id)}
                    className="h-4 w-4"
                    aria-label={`选择 ${w.title}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{w.title}</span>
                  {w.isNsfw && (
                    <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-micro font-medium text-destructive">NSFW</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{w.studioName || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {w.releaseDate ? new Date(w.releaseDate).toLocaleDateString("zh-CN") : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{w.status || "—"}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{w.viewCount ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  {w.gameId ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-micro font-medium text-primary">已收录</span>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <WorkRowActions work={w} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
