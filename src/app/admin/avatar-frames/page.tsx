"use client"

import { ImageUpload } from "@/components/image-upload"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { api } from "@/lib/api-client"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface AvatarFrame {
  id: string
  name: string
  description: string
  imageUrl: string
  isPublic: boolean
  sort: number
  createdAt: string
  _count?: { users: number }
}

export default function AdminAvatarFramesPage() {
  const [frames, setFrames] = useState<AvatarFrame[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingFrame, setEditingFrame] = useState<AvatarFrame | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    isPublic: true,
    sort: 0,
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const loadFrames = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<{ frames: AvatarFrame[] }>(
        "/api/admin/avatar-frames",
      )
      setFrames(data.frames || [])
    } catch (error) {
      console.error("加载头像框列表失败:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFrames()
  }, [loadFrames])

  const openCreate = () => {
    setEditingFrame(null)
    setForm({
      name: "",
      description: "",
      imageUrl: "",
      isPublic: true,
      sort: 0,
    })
    setShowDialog(true)
  }

  const openEdit = (frame: AvatarFrame) => {
    setEditingFrame(frame)
    setForm({
      name: frame.name,
      description: frame.description,
      imageUrl: frame.imageUrl,
      isPublic: frame.isPublic,
      sort: frame.sort,
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.imageUrl) {
      toast.error("请填写名称和上传图片")
      return
    }
    setSaving(true)
    try {
      if (editingFrame) {
        await api.put(`/api/admin/avatar-frames/${editingFrame.id}`, form)
      } else {
        await api.post("/api/admin/avatar-frames", form)
      }
      setShowDialog(false)
      loadFrames()
    } catch (error: any) {
      console.error("保存头像框失败:", error)
      toast.error(error?.message || "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await api.delete(`/api/admin/avatar-frames/${id}`)
      loadFrames()
    } catch (error: any) {
      console.error("删除头像框失败:", error)
      toast.error(error?.message || "删除失败")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">头像框管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理用户可选择的头像框，图片应为透明背景的 PNG
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary hover:opacity-90"
        >
          + 新建头像框
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : frames.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          暂无头像框，点击上方按钮创建
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {frames.map((frame) => (
            <div
              key={frame.id}
              className="bg-muted rounded-xl p-4 flex flex-col items-center gap-3 border ring-1 ring-border"
            >
              <div className="relative w-24 h-24">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-foreground text-2xl font-bold">
                  {frame.name.charAt(0)}
                </div>
                <img
                  src={frame.imageUrl}
                  alt={frame.name}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
              </div>

              <div className="text-center w-full">
                <p className="text-foreground font-medium text-sm truncate">
                  {frame.name}
                </p>
                {frame.description && (
                  <p className="text-muted-foreground text-xs truncate mt-0.5">
                    {frame.description}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      frame.isPublic
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {frame.isPublic ? "公开" : "隐藏"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    排序: {frame.sort}
                  </span>
                </div>
                {frame._count && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {frame._count.users} 人使用
                  </p>
                )}
              </div>

              <div className="flex gap-2 w-full">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs ring-1 ring-border text-foreground hover:bg-accent"
                  onClick={() => openEdit(frame)}
                >
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => setDeleteTargetId(frame.id)}
                  disabled={deleting === frame.id}
                >
                  {deleting === frame.id ? "..." : "删除"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card ring-1 ring-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFrame ? "编辑头像框" : "新建头像框"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm text-foreground mb-1 block">
                名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-muted border ring-1 ring-border rounded-lg px-3 py-2 text-foreground"
                placeholder="例：金色传说"
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1 block">描述</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full bg-muted border ring-1 ring-border rounded-lg px-3 py-2 text-foreground"
                placeholder="可选"
              />
            </div>

            <div>
              <label className="text-sm text-foreground mb-1 block">
                头像框图片 <span className="text-red-400">*</span>
              </label>
              <ImageUpload
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                aspectRatio={1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                建议使用 200×200 透明背景 PNG
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-foreground mb-1 block">
                  排序
                </label>
                <input
                  type="number"
                  value={form.sort}
                  onChange={(e) =>
                    setForm({ ...form, sort: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-muted border ring-1 ring-border rounded-lg px-3 py-2 text-foreground"
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) =>
                      setForm({ ...form, isPublic: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">公开可见</span>
                </label>
              </div>
            </div>

            {form.imageUrl && (
              <div>
                <label className="text-sm text-foreground mb-2 block">
                  预览效果
                </label>
                <div className="relative w-20 h-20">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-foreground text-xl font-bold">
                    A
                  </div>
                  <img
                    src={form.imageUrl}
                    alt="预览"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 ring-1 ring-border text-foreground hover:bg-accent"
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-primary hover:opacity-90"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "保存中…" : editingFrame ? "保存修改" : "创建"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
        title="删除头像框"
        description="确定删除此头像框？使用该头像框的用户将被自动移除头像框。"
        variant="destructive"
        confirmText="删除"
        onConfirm={() => { if (deleteTargetId) handleDelete(deleteTargetId) }}
      />
    </div>
  )
}