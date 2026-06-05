"use client"

import { ImageUpload } from "@/components/image-upload"
import { RichTextContent } from "@/components/rich-text-content-wrapper"
import { RichTextEditor } from "@/components/rich-text-editor-wrapper"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useAutoSaveDraft } from "@/hooks/use-auto-save-draft"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

/** 去除 HTML 标签，返回纯文本 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

interface Ann {
  id: string; title: string; content: string; imageUrl: string;
  link: string; isActive: boolean; sortOrder: number; createdAt: string
}

export function AnnouncementsManager({ initialAnns }: { initialAnns: Ann[] }) {
  const [anns, setAnns] = useState(initialAnns)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [imageUrl, setImageUrl] = useState("")

  useUnsavedChanges(title.trim() !== "" || content.trim() !== "")
  const [link, setLink] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  // ── 自动保存草稿（仅新建模式） ──
  const isEditing = editingId !== null
  const { draft, updateDraft, hasRestored, clearDraft } = useAutoSaveDraft({
    key: "announcement-create",
    defaultValue: { title: "", content: "", link: "" },
    enabled: !isEditing,
  })

  const [draftRestored, setDraftRestored] = useState(false)
  const showDraftBanner = !isEditing && hasRestored && !draftRestored && (title === "" && content === "")

  // 同步表单状态到草稿
  useEffect(() => {
    if (isEditing) return
    updateDraft({ title, content, link })
  }, [isEditing, title, content, link, updateDraft])

  function restoreDraft() {
    setTitle(draft.title)
    setContent(draft.content)
    setLink(draft.link)
    setDraftRestored(true)
  }

  const inputCls = "w-full rounded-xl bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring transition-all"

  function startEdit(ann: Ann) {
    setEditingId(ann.id)
    setTitle(ann.title)
    setContent(ann.content)
    setImageUrl(ann.imageUrl)
    setLink(ann.link)
    setError("")
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function cancelEdit() {
    setEditingId(null)
    setTitle("")
    setContent("")
    setImageUrl("")
    setLink("")
    setError("")
  }

  async function submitAnn(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setAdding(true)

    const isEditing = editingId !== null
    const url = isEditing ? `/api/admin/announcements/${editingId}` : "/api/admin/announcements"
    const method = isEditing ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content: content.trim(), imageUrl, link: link.trim() }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setError(data.error); return }

    if (isEditing) {
      setAnns((prev) => prev.map((a) => a.id === editingId ? { ...a, ...data } : a))
      toast.success("公告已更新")
      cancelEdit()
    } else {
      setAnns((prev) => [{ ...data, createdAt: data.createdAt }, ...prev])
      clearDraft()
      setTitle(""); setContent(""); setImageUrl(""); setLink("")
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    })
    if (res.ok) setAnns((prev) => prev.map((a) => a.id === id ? { ...a, isActive: !current } : a))
  }

  async function deleteAnn(id: string) {
    const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("公告已删除")
      setAnns((prev) => prev.filter((a) => a.id !== id))
    } else {
      toast.error("删除失败")
      throw new Error("删除失败")
    }
  }

  // --- Drag & Drop handlers ---
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = "move"
    // store dragged element ref
    dragNodeRef.current = e.currentTarget as HTMLDivElement
    // slight delay to allow the browser to capture the drag image
    setTimeout(() => {
      if (dragNodeRef.current) dragNodeRef.current.style.opacity = "0.4"
    }, 0)
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1"
    dragNodeRef.current = null
    setDraggingId(null)
    setDragOverId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverId(id)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverId(null)
    if (!draggingId || draggingId === targetId) return

    const dragIndex = anns.findIndex((a) => a.id === draggingId)
    const targetIndex = anns.findIndex((a) => a.id === targetId)
    if (dragIndex === -1 || targetIndex === -1) return

    // Reorder locally
    const newAnns = [...anns]
    const [removed] = newAnns.splice(dragIndex, 1)
    newAnns.splice(targetIndex, 0, removed)
    setAnns(newAnns)

    // Persist to server
    const orderedIds = newAnns.map((a) => a.id)
    try {
      const res = await fetch("/api/admin/announcements/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      })
      if (!res.ok) toast.error("排序保存失败")
    } catch {
      toast.error("排序保存失败")
    }
  }, [draggingId, anns])

  return (
    <div className="space-y-4">
      {/* 创建/编辑表单 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          {editingId ? "编辑公告" : "发布公告"}
        </h2>
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">{error}</p>}
        {showDraftBanner && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400 ring-1 ring-amber-500/20">
            <span>检测到未保存的草稿「{draft.title || "无标题"}」，是否恢复？</span>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={restoreDraft}
                className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors">
                恢复
              </button>
              <button type="button" onClick={() => { clearDraft(); setDraftRestored(true) }}
                className="rounded-lg px-3 py-1 text-xs font-medium text-amber-400/60 hover:text-amber-300 transition-colors">
                丢弃
              </button>
            </div>
          </div>
        )}
        <form onSubmit={submitAnn} className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="公告标题 *" required className={inputCls} />

          {/* 富文本编辑器 */}
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">公告内容 *</p>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="公告内容，支持富文本格式和图片上传…"
            />
          </div>

          {/* 封面图片 */}
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">封面图片（选填）</p>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              aspectRatio={16 / 9}
              maxSizeMB={5}
              placeholder="上传公告图片（可选）"
            />
          </div>

          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="跳转链接（选填）" className={inputCls} />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={adding}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-60">
              {adding
                ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
                : editingId
                  ? <Pencil className="h-5 w-5" strokeWidth={2} />
                  : <Plus className="h-5 w-5" strokeWidth={2} />}
              {adding ? (editingId ? "保存中…" : "发布中…") : (editingId ? "保存修改" : "发布公告")}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit}
                className="flex items-center gap-1.5 rounded-xl bg-muted px-5 py-2.5 text-sm font-medium text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground">
                <X className="h-5 w-5" strokeWidth={2} />
                取消编辑
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 公告列表 */}
      <div className="rounded-xl bg-card ring-1 ring-border overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">共 {anns.length} 条公告 · 拖拽排序</p>
        </div>
        <div className="divide-y divide-border">
          {anns.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">暂无公告</p>}
          {anns.map((ann) => (
            <div
              key={ann.id}
              draggable
              onDragStart={(e) => handleDragStart(e, ann.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, ann.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, ann.id)}
              className={`px-4 py-3 hover:bg-accent/50 transition-colors ${
                draggingId === ann.id ? "opacity-40" : ""
              } ${dragOverId === ann.id && draggingId !== ann.id ? "border-t-2 border-blue-500" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Drag handle */}
                <div
                  className="mt-1 flex shrink-0 cursor-grab active:cursor-grabbing touch-none items-center text-muted-foreground hover:text-foreground"
                  title="拖拽排序"
                >
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${ann.isActive ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" : "bg-muted text-muted-foreground ring-border"}`}>
                      {ann.isActive ? "展示中" : "已隐藏"}
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">{ann.title}</span>
                  </div>
                  {/* 内容预览：折叠时显示纯文本，展开时显示富文本 */}
                  {expandedId === ann.id ? (
                    <RichTextContent html={ann.content} />
                  ) : (
                    <p className="text-xs text-muted-foreground line-clamp-2">{stripHtml(ann.content)}</p>
                  )}
                  {ann.imageUrl && (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ann.imageUrl} alt="" className="h-16 rounded-lg object-cover ring-1 ring-border" />
                    </div>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground">{new Date(ann.createdAt).toLocaleDateString("zh-CN")}</p>
                    {ann.content.length > 100 && (
                      <button onClick={() => setExpandedId(expandedId === ann.id ? null : ann.id)}
                        className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                        {expandedId === ann.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {expandedId === ann.id ? "收起" : "展开"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button onClick={() => startEdit(ann)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="编辑公告">
                    <Pencil className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button onClick={() => toggleActive(ann.id, ann.isActive)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    {ann.isActive ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
                  </button>
                  <button onClick={() => setDeleteId(ann.id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={v => !v && setDeleteId(null)}
        title="删除公告"
        description="确定要删除该公告吗？删除后用户将无法看到此公告。"
        confirmText="删除"
        variant="destructive"
        onConfirm={() => deleteAnn(deleteId!)}
      />
    </div>
  )
}