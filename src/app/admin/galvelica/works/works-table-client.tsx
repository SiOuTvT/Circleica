"use client"

import { useState } from "react"
import { Layers } from "lucide-react"
import { AdminDataTable } from "@/components/admin/admin-data-table"
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

      <AdminDataTable
        rows={works}
        rowKey={(w) => w.id}
        emptyIcon={Layers}
        emptyTitle="暂无作品"
        emptyDescription="Galvelica 资料馆还没有作品数据"
        selectable
        selectedKeys={Array.from(selected)}
        onToggleRow={toggle}
        onToggleAll={toggleAll}
        allSelected={allChecked}
        columns={[
          {
            key: "title",
            label: "作品",
            render: (w) => (
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                  {w.title.charAt(0)}
                </span>
                <span className="truncate font-medium text-foreground" title={w.title}>
                  {w.title?.trim() || "—"}
                </span>
                {w.isNsfw && <AdminStatusBadge tone="danger">NSFW</AdminStatusBadge>}
              </span>
            ),
          },
          {
            key: "studioName",
            label: "制作组",
            width: "140px",
            render: (w) => (
              <span className="block truncate text-xs text-muted-foreground" title={w.studioName ?? ""}>
                {w.studioName?.trim() || "—"}
              </span>
            ),
          },
          {
            key: "releaseDate",
            label: "发售日",
            width: "130px",
            render: (w) => (
              <span className="text-xs text-muted-foreground">
                {w.releaseDate ? new Date(w.releaseDate).toLocaleDateString("zh-CN") : "—"}
              </span>
            ),
          },
          {
            key: "status",
            label: "状态",
            width: "160px",
            render: (w) => (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-xs text-muted-foreground">{w.status?.trim() || "—"}</span>
                {w.gameId ? <AdminStatusBadge tone="success">已收录</AdminStatusBadge> : null}
              </span>
            ),
          },
          {
            key: "viewCount",
            label: "浏览",
            numeric: true,
            width: "104px",
            render: (w) => (w.viewCount ?? 0).toLocaleString(),
          },
        ]}
        actions={(w) => <WorkRowActions work={w} />}
      />
    </div>
  )
}
