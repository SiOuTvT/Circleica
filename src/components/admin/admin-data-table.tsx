import type { LucideIcon } from "lucide-react"
import { Fragment, type KeyboardEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { Inbox } from "lucide-react"

export interface AdminTableColumn<T> {
  key: string
  label: ReactNode
  align?: "left" | "right"
  width?: string
  sortable?: boolean
  /** 数字类列：自动右对齐 + tabular-nums（计数 / 浏览量 / 大小 / 分值 / 下载次数） */
  numeric?: boolean
  /** 单元格内容；缺省按 key 取行上的同名字段 */
  render?: (row: T) => ReactNode
  className?: string
  headerClassName?: string
}

export interface AdminDataTableProps<T> {
  columns: AdminTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** 操作列渲染器，永远固定最右，按钮沿用 adminBtn* 档位 */
  actions?: (row: T) => ReactNode
  actionsLabel?: string
  actionsWidth?: string
  /** 勾选列（游戏页批量删除用） */
  selectable?: boolean
  selectedKeys?: string[]
  onToggleRow?: (key: string) => void
  onToggleAll?: () => void
  allSelected?: boolean
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  /** 行级附加类名（如禁用行降透明度） */
  rowClassName?: (row: T) => string | undefined
  /** 行内展开区：返回非 null 时在该行下方插一个跨列的行（用于行内编辑表单） */
  expanded?: (row: T) => ReactNode | null
  /** 分页 / 计数，渲染在表格下方 */
  footer?: ReactNode
  className?: string
}

/**
 * AdminDataTable — 后台记录型列表的统一实现（期 2）。
 *
 * 版式基因（不要在各页另起一套）：
 *  · 真 table / thead / tbody，表头 th 带 scope="col"
 *  · 表头 11/600 + eyebrow 字距，sticky top:0，背景取 --card（不透明，滚动不透字）
 *  · 行高 44px，单元格 12px 上下 / 16px 左右，一行一条记录，单元格内不再套卡片
 *  · 数字列右对齐 + tabular-nums；主标识列左对齐 13/500 + 单行截断（title 给全名）
 *  · 无斑马纹；hover 行走 --accent/60 一档，不加阴影
 *  · <md 横向滚动（外层 overflow-x-auto），不做卡片回落、不做两套渲染分支
 *
 * 未加 "use client"：服务端页面可直接传 render 函数；被客户端组件引用时随其进入客户端包。
 */
export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  actions,
  actionsLabel = "操作",
  actionsWidth,
  selectable = false,
  selectedKeys,
  onToggleRow,
  onToggleAll,
  allSelected,
  emptyIcon,
  emptyTitle = "暂无数据",
  emptyDescription,
  rowClassName,
  expanded,
  footer,
  className,
}: AdminDataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ?? Inbox}
        title={emptyTitle}
        description={emptyDescription}
        bordered
      />
    )
  }

  const cols: AdminTableColumn<T>[] = actions
    ? [
        ...columns,
        {
          key: "__actions",
          label: actionsLabel,
          align: "right",
          width: actionsWidth,
          render: (row) => actions(row),
        },
      ]
    : columns

  // 展开行跨列用的列总数（数据列 + 操作列 + 勾选列）
  const colCount = cols.length + (selectable ? 1 : 0)

  return (
    <div className={cn("w-full", className)}>
      {/* 窄屏横向滚动；lg 以上放开 overflow，让 sticky 表头相对视口生效 */}
      <div className="overflow-x-auto lg:overflow-x-visible">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {selectable && (
                <th
                  scope="col"
                  className="w-10 whitespace-nowrap border-b border-border bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]"
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    aria-label="全选本页"
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                </th>
              )}
              {cols.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={c.width ? { width: c.width } : undefined}
                  className={cn(
                    // 显式任意值 + md 变体：text-micro/text-xs 会被 cn() 的 tailwind-merge
                    // 判成 text-color 组、被同串里的 text-muted-foreground 顶掉（论坛徽标同坑）
                    "whitespace-nowrap border-b border-border bg-card px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[11px]",
                    (c.align === "right" || (c.numeric && c.align !== "left")) ? "text-right" : "text-left",
                    c.headerClassName,
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = rowKey(row)
              const selected = selectedKeys?.includes(key)
              const extra = expanded?.(row) ?? null
              return (
                <Fragment key={key}>
                <tr
                  className={cn("h-11 transition-colors hover:bg-accent/60", selected && "bg-accent/60", selectable && "cursor-pointer", rowClassName?.(row))}
                  onClick={selectable ? () => onToggleRow?.(key) : undefined}
                  tabIndex={selectable ? 0 : undefined}
                  onKeyDown={
                    selectable
                      ? (e: KeyboardEvent<HTMLTableRowElement>) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            onToggleRow?.(key)
                          }
                        }
                      : undefined
                  }
                >
                  {selectable && (
                    <td className="border-b border-border px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleRow?.(key)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="选择该行"
                        className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                      />
                    </td>
                  )}
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "border-b border-border px-4 py-2 align-middle",
                        (c.align === "right" || (c.numeric && c.align !== "left")) ? "text-right" : "text-left",
                        c.numeric && "num-tab",
                        c.key === "__actions" && "whitespace-nowrap",
                        c.className,
                      )}
                      onClick={selectable && c.key === "__actions" ? (e) => e.stopPropagation() : undefined}
                    >
                      {c.render
                        ? c.render(row)
                        : ((row as unknown as Record<string, ReactNode>)[c.key] ?? null)}
                    </td>
                  ))}
                </tr>
                {extra ? (
                  <tr>
                    {/* 展开行：必须显式 colSpan = 实际列总数（数据列 + 操作列 + 勾选列），
                        否则表单会被塞进第一列，输入框塌成 0 宽。
                        表单列宽统一 max-w-[760px]，各页不要再自己拼 tr。 */}
                    <td
                      colSpan={colCount}
                      className="w-full border-b border-border px-4 py-3 align-top"
                    >
                      <div className="w-full max-w-[760px]">{extra}</div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  )
}
