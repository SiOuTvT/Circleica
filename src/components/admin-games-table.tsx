"use client"

import { Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "./ui/confirm-dialog"
import { AdminDeleteButton } from "./admin-delete-button"

type Game = {
  id: string
  title: string
  status: string
  isNsfw: boolean
  isPublished: boolean
  viewCount: number
  favoriteCount: number
  createdAt: Date
  tags: { tag: { name: string; color: string } }[]
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
      const res = await fetch("/api/admin/games/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`成功删除 ${data.deleted} 个游戏`)
        setSelected(new Set())
        router.refresh()
      } else {
        toast.error(data.error || "删除失败")
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

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="w-10 px-3 py-3.5">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer" />
                </th>
                <th className="px-5 py-3.5 font-semibold tracking-wide">游戏名称</th>
                <th className="hidden px-5 py-3.5 font-semibold tracking-wide sm:table-cell">标签</th>
                <th className="px-5 py-3.5 font-semibold tracking-wide">状态</th>
                <th className="hidden px-5 py-3.5 font-semibold tracking-wide md:table-cell">浏览</th>
                <th className="px-5 py-3.5 font-semibold tracking-wide text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {games.map((g) => (
                <tr key={g.id} className="group transition-colors hover:bg-accent/30">
                  <td className="w-10 px-3 py-3.5">
                    <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggle(g.id)}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer" />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground line-clamp-1">{g.title}</span>
                      {g.isNsfw && (
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-micro font-semibold bg-red-500/10 text-red-400 ring-1 ring-red-500/20">R18</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-5 py-3.5 sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {g.tags.slice(0, 3).map(({ tag }) => (
                        <span key={tag.name} className="game-card-tag inline-block text-xs font-medium px-2 py-0.5 rounded-md max-w-[96px] truncate"
                          title={tag.name}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-micro font-semibold leading-none ${g.isPublished ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "bg-muted text-muted-foreground ring-1 ring-border"}`}>
                      {g.isPublished ? "已发布" : "草稿"}
                    </span>
                  </td>
                  <td className="hidden px-5 py-3.5 text-xs text-muted-foreground tabular-nums md:table-cell">{g.viewCount?.toLocaleString() ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/games/${g.id}`}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground"
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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