import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { Inbox } from "lucide-react"

export interface AdminTableColumn<T> {
  key: string
  header: ReactNode
  align?: "left" | "right" | "center"
  className?: string
  cell: (row: T) => ReactNode
}

interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string | number
  stickyHeader?: boolean
  onRowClick?: (row: T) => void
  empty?: ReactNode
}

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const

/**
 * AdminTable — 后台统一声明式表格。
 * 纯 Server Component，数据无关：仅接收已映射的 DTO 与展示配置。
 * Accent 通过 var(--admin-accent, var(--primary)) 下沉，主站无需改动。
 */
export function AdminTable<T>({
  columns,
  rows,
  getRowKey,
  stickyHeader,
  onRowClick,
  empty,
}: AdminTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className={cn(stickyHeader && "sticky top-0 z-10", "bg-muted/40 text-muted-foreground")}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 font-medium",
                  col.align && alignClass[col.align],
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn("transition-colors hover:bg-accent/30", onRowClick && "cursor-pointer")}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-3 align-middle",
                    col.align && alignClass[col.align],
                    col.className,
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (empty ?? <EmptyState icon={Inbox} title="暂无数据" className="py-12" />)}
    </div>
  )
}

interface AdminTableFrameProps {
  children: ReactNode
  stickyHeader?: boolean
}

/**
 * AdminTableFrame — 仅提供表格 chrome 的外层包装。
 * 用于无法走声明式 AdminTable 的交互式 client 表格：<thead>（sticky 时由消费方自行加
 * `sticky top-0 z-10`）/ <tbody> 由 children 提供。class 字符串与 AdminTable 保持一致。
 */
export function AdminTableFrame({ children }: AdminTableFrameProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}
