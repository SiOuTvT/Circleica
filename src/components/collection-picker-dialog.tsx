"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client"
import { logger } from "@/lib/logger"
import { Check, Folder, FolderPlus, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface Collection {
  id: string
  name: string
  description: string
  isDefault: boolean
  _count: { favorites: number }
}

export function CollectionPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentCollectionId,
  isFav,
  gameId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (collectionId: string | null) => void
  currentCollectionId?: string | null
  isFav: boolean
  gameId: string
}) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    apiGet<{ success: boolean; data: Collection[] }>("/api/collections")
      .then((data) => { setCollections(Array.isArray(data.data) ? data.data : []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  async function handleCreate() {
    if (!newName.trim() || creating) return
    setCreating(true)
    try {
      const col = await apiPost<{ success: boolean; data: Collection }>("/api/collections", { name: newName.trim() })
      if (col.success && col.data) {
        setCollections((prev) => [...prev, col.data!])
        setNewName("")
        setShowCreate(false)
        handleSelect(col.data.id)
      } else {
        toast.error("创建收藏集失败")
      }
    } catch {
      toast.error("创建收藏集失败，请重试")
    } finally {
      setCreating(false)
    }
  }

  async function handleSelect(collectionId: string | null) {
    setSubmitting(collectionId || "__none__")
    try {
      if (!isFav) {
        await apiPost(`/api/games/${gameId}/favorite`, { collectionId })
      } else {
        await apiPut(`/api/games/${gameId}/favorite`, { collectionId })
      }
      onSelect(collectionId)
      onOpenChange(false)
    } catch (err) {
      logger.user.warn("[CollectionPickerDialog] select collection failed", { error: err instanceof Error ? err.message : String(err) })
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">选择收藏集</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* 新建收藏集 - 放在第一位 */}
              {showCreate ? (
                <div className="flex items-center gap-2 rounded-lg px-4 py-3 bg-muted/50">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="收藏集名称"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    maxLength={50}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={!newName.trim() || creating}
                    className="h-8 px-3 text-xs"
                  >
                    {creating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "创建"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowCreate(false)
                      setNewName("")
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    取消
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <FolderPlus className="h-5 w-5 shrink-0" />
                  <span>新建收藏集</span>
                </button>
              )}

              {/* 默认收藏夹 */}
              <button
                onClick={() => handleSelect(null)}
                disabled={submitting !== null}
                className="flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">默认收藏夹</span>
                {currentCollectionId === null && isFav && (
                  <Check className="h-5 w-5 text-primary shrink-0" />
                )}
                {submitting === "__none__" && (
                  <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                )}
              </button>

              {/* 收藏集列表 */}
              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleSelect(col.id)}
                  disabled={submitting !== null}
                  className="flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-left text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{col.name}</span>
                  <span className="text-xs text-muted-foreground/50 mr-1">{col._count.favorites}</span>
                  {currentCollectionId === col.id && isFav && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                  {submitting === col.id && (
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}