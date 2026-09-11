"use client"

import { Gamepad2, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "./ui/confirm-dialog"
import { AdminDeleteButton } from "./admin-delete-button"
import { AdminDataTable } from "./admin/admin-data-table"
import { formatDate } from "@/lib/date"
import { api } from "@/lib/api-client"

type Game = {
  id: string
  title: string
  status: string
  isNsfw: boolean
  isPublished: boolean
  viewCount: number
  favoriteCount: number
  createdAt: Date
  updatedAt: Date
  coverImage: string | null
  tagCount: number
}

export function AdminGamesTable({ games }: { games: Game[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const allSelected = games.length > 0 && selected.size === games.length

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(games.map(g => g.id)))
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function batchDelete() {
    if (selected.size === 0) return
    setDeleting(true)
    try {
      // api.post 返回后端完整响应体 { success, data: [{count},...] }，成功标准 = data.data 是数组
      const data = await api.post<{ data?: { count: number }[] } | { count: number }[]>("/api/admin/games/batch-delete", { ids: Array.from(selected) })
      const arr = (data as { data?: { count: number }[] })?.data
      if (Array.isArray(arr)) {
        // 最后一项是 game.deleteMany 的计数
        const deleted = arr.length > 0 ? arr[arr.length - 1].count : 0
        toast.success(`成功删除 ${deleted} 个游戏`)
        setSelected(new Set())
        router.refresh()
      } else {
        toast.error("删除失败")
      }
    } catch {
      toast.error("删除失败，请重试")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-muted p-3 ring-1 ring-border">
          <span className="text-sm text-foreground">已选 <strong>{selected.size}</strong> 项</span>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            {deleting ? "删除中…" : "批量删除"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            取消选择
          </button>
        </div>
      )}

      <AdminDataTable
        rows={games}
        rowKey={(g) => g.id}
        emptyIcon={Gamepad2}
        emptyTitle="暂无游戏"
        emptyDescription="点击右上角「新增游戏」开始添加"
        selectable
        selectedKeys={Array.from(selected)}
        onToggleRow={toggle}
        onToggleAll={toggleAll}
        allSelected={allSelected}
        columns={[
          {
            key: "title",
            label: "游戏",
            render: (g) => (
              <span className="flex min-w-0 items-center gap-3">
                <span className="h-11 w-8 shrink-0 overflow-hidden rounded bg-muted">
                  {g.coverImage ? (
                    <Image src={g.coverImage} alt="" width={32} height={44} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Gamepad2 className="h-4 w-4" />
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-foreground" title={g.title}>{g.title}</span>
                  {g.isNsfw && (
                    <span className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-red-400 ring-1 ring-red-500/20">
                      R18
                    </span>
                  )}
                </span>
              </span>
            ),
          },
          {
            key: "isPublished",
            label: "状态",
            width: "96px",
            render: (g) => (
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none ${g.isPublished ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "bg-muted text-muted-foreground ring-1 ring-border"}`}>
                {g.isPublished ? "已发布" : "草稿"}
              </span>
            ),
          },
          {
            key: "tagCount",
            label: "标签数",
            numeric: true,
            width: "96px",
            render: (g) => g.tagCount ?? 0,
          },
          {
            key: "viewCount",
            label: "浏览量",
            numeric: true,
            width: "112px",
            render: (g) => (g.viewCount ?? 0).toLocaleString(),
          },
          {
            key: "updatedAt",
            label: "更新时间",
            width: "140px",
            render: (g) => <span className="text-xs text-muted-foreground">{formatDate(g.updatedAt)}</span>,
          },
        ]}
        actions={(g) => (
          <span className="inline-flex items-center gap-1.5">
            <Link
              href={`/admin/games/${g.id}`}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border transition duration-150 ease-in-out hover:bg-accent hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />编辑
            </Link>
            <AdminDeleteButton
              endpoint={`/api/admin/games/${g.id}`}
              title="删除游戏"
              description={`确定要删除《${g.title}》吗？此操作不可撤销，相关资源与评论将一并删除。`}
              successMessage="游戏已删除"
              buttonTitle={`删除 ${g.title}`}
            />
          </span>
        )}
        actionsWidth="176px"
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="批量删除游戏"
        description={`确定要删除选中的 ${selected.size} 个游戏吗？删了就找不回来了。`}
        variant="destructive"
        confirmText="删除"
        onConfirm={batchDelete}
      />
    </>
  )
}
