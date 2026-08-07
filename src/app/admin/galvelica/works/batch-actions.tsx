"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Link2, Unlink, Trash2, Flag } from "lucide-react"
import { batchDeleteWorks, batchToggleInclusion, batchSetNsfw } from "./actions"
import { AdminBatchActions } from "@/components/admin/admin-batch-actions"

export function WorkBatchActions({ selected, onClear }: { selected: Set<string>; onClear?: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const ids = Array.from(selected)

  async function run(fn: (fd: FormData) => Promise<void>, extra: Record<string, string>, msg: string) {
    if (ids.length === 0) {
      toast.error("请先勾选作品")
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set("ids", ids.join(","))
      for (const [k, v] of Object.entries(extra)) fd.set(k, v)
      await fn(fd)
      toast.success(msg)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminBatchActions count={ids.length} onClear={onClear}>
      <button
        type="button"
        disabled={busy || ids.length === 0}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/20 disabled:opacity-50"
        onClick={() => run(batchToggleInclusion, { include: "true" }, "已创建收录草稿")}
      >
        <Link2 className="h-3.5 w-3.5" /> 批量收录
      </button>
      <button
        type="button"
        disabled={busy || ids.length === 0}
        className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground disabled:opacity-50"
        onClick={() => run(batchToggleInclusion, { include: "false" }, "已取消收录")}
      >
        <Unlink className="h-3.5 w-3.5" /> 取消收录
      </button>
      <button
        type="button"
        disabled={busy || ids.length === 0}
        className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground disabled:opacity-50"
        onClick={() => run(batchSetNsfw, { nsfw: "true" }, "已标为 NSFW")}
      >
        <Flag className="h-3.5 w-3.5" /> 标 NSFW
      </button>
      <button
        type="button"
        disabled={busy || ids.length === 0}
        className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive ring-1 ring-destructive/20 transition-colors hover:bg-destructive/20 disabled:opacity-50"
        onClick={() => {
          if (confirm(`确认删除选中的 ${ids.length} 部作品？子表会一并清除且不可恢复。`)) {
            run(batchDeleteWorks, {}, "已删除作品")
          }
        }}
      >
        <Trash2 className="h-3.5 w-3.5" /> 批量删除
      </button>
    </AdminBatchActions>
  )
}
