"use client"

import { ImageUpload } from "@/components/image-upload"
import { Badge } from "@/components/ui/badge"
import { RichTextContent } from "@/components/rich-text-content-wrapper"
import { RichTextEditor } from "@/components/rich-text-editor-wrapper"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import Image from "next/image"
import { useAutoSaveDraft } from "@/hooks/use-auto-save-draft"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Loader2, Pencil, Pin, Plus, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

const STATUS_LABELS: Record<string, string> = { draft: "草稿", published: "已发布", hidden: "已隐藏" }
const STATUS_VARIANTS: Record<string, "default" | "success" | "secondary"> = { draft: "secondary", published: "success", hidden: "default" }

interface Ann {
  id: string; title: string; summary: string; content: string; imageUrl: string;
  link: string; status: string; isPinned: boolean; isActive: boolean; sortOrder: number;
  startAt: string | null; endAt: string | null; createdAt: string; updatedAt: string
}

export function AnnouncementsManager({ initialAnns }: { initialAnns: Ann[] }) {
  const [anns, setAnns] = useState(initialAnns)
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [content, setContent] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [link, setLink] = useState("")
  const [status, setStatus] = useState<string>("draft")
  const [isPinned, setIsPinned] = useState(false)
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragNodeRef = useRef<HTMLDivElement | null>(null)

  const isEditing = editingId !== null
  useUnsavedChanges(!isEditing && (title.trim() !== "" || content.trim() !== ""))

  const { draft, updateDraft, hasRestored, clearDraft } = useAutoSaveDraft({
    key: "announcement-create",
    defaultValue: { title: "", summary: "", content: "", link: "" },
    enabled: !isEditing,
  })

  const [draftRestored, setDraftRestored] = useState(false)
  const showDraftBanner = !isEditing && hasRestored && !draftRestored && (title === "" && content === "")

  useEffect(() => {
    if (isEditing) return
    updateDraft({ title, summary, content, link })
  }, [isEditing, title, summary, content, link, updateDraft])

  function restoreDraft() {
    setTitle(draft.title); setSummary(draft.summary); setContent(draft.content); setLink(draft.link)
    setDraftRestored(true)
  }

  const inputCls = "w-full rounded-xl bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring transition-all"
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1.5"

  function startEdit(ann: Ann) {
    setEditingId(ann.id); setTitle(ann.title); setSummary(ann.summary); setContent(ann.content)
    setImageUrl(ann.imageUrl); setLink(ann.link); setStatus(ann.status); setIsPinned(ann.isPinned)
    setStartAt(ann.startAt ? new Date(ann.startAt).toISOString().slice(0, 16) : "")
    setEndAt(ann.endAt ? new Date(ann.endAt).toISOString().slice(0, 16) : "")
    setError(""); window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function cancelEdit() {
    setEditingId(null); setTitle(""); setSummary(""); setContent(""); setImageUrl(""); setLink("")
    setStatus("draft"); setIsPinned(false); setStartAt(""); setEndAt(""); setError("")
  }

  function clearForm() {
    setTitle(""); setSummary(""); setContent(""); setImageUrl(""); setLink("")
    setStatus("draft"); setIsPinned(false); setStartAt(""); setEndAt("")
  }

  async function submitAnn(e: React.FormEvent) {
    e.preventDefault(); setError(""); setAdding(true)
    const url = isEditing ? `/api/admin/announcements/${editingId}` : "/api/admin/announcements"
    const method = isEditing ? "PUT" : "POST"
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(), summary: summary.trim(), content: content.trim(),
        imageUrl, link: link.trim(), status, isPinned,
        startAt: startAt || undefined, endAt: endAt || undefined,
      }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setError(data.error || "操作失败"); return }

    if (isEditing) {
      setAnns(prev => prev.map(a => a.id === editingId ? { ...a, ...data.data } : a))
      toast.success("公告已更新"); cancelEdit()
    } else {
      setAnns(prev => [data.data ?? data, ...prev])
      clearDraft(); clearForm(); toast.success("公告已创建")
    }
  }

  async function togglePinned(id: string, current: boolean) {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !current }),
    })
    if (res.ok) setAnns(prev => prev.map(a => a.id === id ? { ...a, isPinned: !current } : a))
  }

  async function toggleStatus(id: string, newStatus: string) {
    const res = await fetch(`/api/admin/announcements/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, isActive: newStatus !== "hidden" }),
    })
    if (res.ok) {
      setAnns(prev => prev.map(a => a.id === id ? { ...a, status: newStatus, isActive: newStatus !== "hidden" } : a))
      toast.success(`已${STATUS_LABELS[newStatus]}`)
    }
  }

  async function deleteAnn(id: string) {
    const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("公告已删除"); setAnns(prev => prev.filter(a => a.id !== id)) }
    else { toast.error("删除失败"); throw new Error("删除失败") }
  }

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggingId(id); e.dataTransfer.effectAllowed = "move"
    dragNodeRef.current = e.currentTarget as HTMLDivElement
    setTimeout(() => { if (dragNodeRef.current) dragNodeRef.current.style.opacity = "0.4" }, 0)
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1"
    dragNodeRef.current = null; setDraggingId(null); setDragOverId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverId(id)
  }, [])

  const handleDragLeave = useCallback(() => { setDragOverId(null) }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); setDragOverId(null)
    if (!draggingId || draggingId === targetId) return
    const dragIndex = anns.findIndex(a => a.id === draggingId)
    const targetIndex = anns.findIndex(a => a.id === targetId)
    if (dragIndex === -1 || targetIndex === -1) return
    const newAnns = [...anns]; const [removed] = newAnns.splice(dragIndex, 1)
    newAnns.splice(targetIndex, 0, removed); setAnns(newAnns)
    try {
      const res = await fetch("/api/admin/announcements/reorder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: newAnns.map(a => a.id) }),
      })
      if (!res.ok) toast.error("排序保存失败")
    } catch { toast.error("排序保存失败") }
  }, [draggingId, anns])

  const previewAnn: Ann = {
    id: "preview", title: title || "公告标题", summary, content,
    imageUrl, link, status, isPinned, isActive: true, sortOrder: 0,
    startAt: null, endAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── 左侧：编辑区域 ── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* 创建/编辑表单 */}
        <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
          <h2 className="text-sm font-semibold text-foreground">{isEditing ? "编辑公告" : "发布公告"}</h2>
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">{error}</p>}
          {showDraftBanner && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-500/10 px-4 py-2.5 text-sm text-amber-400 ring-1 ring-amber-500/20">
              <span>检测到未保存的草稿「{draft.title || "无标题"}」</span>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={restoreDraft} className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors">恢复</button>
                <button type="button" onClick={() => { clearDraft(); setDraftRestored(true) }} className="rounded-lg px-3 py-1 text-xs font-medium text-amber-400/60 hover:text-amber-300 transition-colors">丢弃</button>
              </div>
            </div>
          )}
          <form onSubmit={submitAnn} className="space-y-4">
            <div>
              <label className={labelCls}>标题 *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="公告标题" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>摘要</label>
              <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="简短摘要，用于前台卡片展示（选填）" rows={2} className={inputCls + " resize-none"} />
            </div>
            <div>
              <label className={labelCls}>封面图片</label>
              <div className="rounded-xl overflow-hidden ring-1 ring-border">
                <ImageUpload value={imageUrl} onChange={setImageUrl} aspectRatio={16 / 9} maxSizeMB={5} placeholder="上传封面（16:9 推荐）" />
              </div>
            </div>
            <div>
              <label className={labelCls}>正文 *</label>
              <RichTextEditor content={content} onChange={setContent} placeholder="公告内容，支持富文本格式…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>状态</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls + " cursor-pointer"}>
                  <option value="draft">草稿</option>
                  <option value="published">已发布</option>
                  <option value="hidden">已隐藏</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="rounded" />
                  <Pin className="h-4 w-4" />
                  <span className="text-sm text-foreground">置顶</span>
                </label>
              </div>
            </div>
            <div>
              <label className={labelCls}>外部链接（选填）</label>
              <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>定时上线</label>
                <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>定时下线</label>
                <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button type="submit" disabled={adding} className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-60">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {adding ? (isEditing ? "保存中…" : "创建中…") : (isEditing ? "保存修改" : "创建公告")}
              </button>
              {isEditing && (
                <button type="button" onClick={cancelEdit} className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground">
                  <X className="h-4 w-4" /> 取消
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 公告列表 */}
        <div className="rounded-xl bg-card ring-1 ring-border">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">共 {anns.length} 条公告 · 拖拽排序</p>
          </div>
          <div className="divide-y divide-border">
            {anns.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">暂无公告</p>}
            {anns.map(ann => (
              <div key={ann.id} draggable onDragStart={e => handleDragStart(e, ann.id)} onDragEnd={handleDragEnd}
                onDragOver={e => handleDragOver(e, ann.id)} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, ann.id)}
                className={`px-4 py-3 hover:bg-accent/50 transition-colors ${draggingId === ann.id ? "opacity-40" : ""} ${dragOverId === ann.id && draggingId !== ann.id ? "border-t-2 border-primary" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground" title="拖拽排序">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  {/* 缩略图 */}
                  {ann.imageUrl && (
                    <div className="w-16 h-9 shrink-0 rounded-lg overflow-hidden bg-muted">
                      <Image src={ann.imageUrl} alt="" width={64} height={36} className="w-full h-full object-cover" unoptimized />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      {ann.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                      <Badge variant={STATUS_VARIANTS[ann.status] ?? "secondary"} size="sm">{STATUS_LABELS[ann.status] ?? ann.status}</Badge>
                      <span className="text-sm font-medium text-foreground truncate">{ann.title}</span>
                    </div>
                    {expandedId === ann.id ? (
                      <RichTextContent html={ann.content} />
                    ) : (
                      <p className="text-xs text-muted-foreground line-clamp-1">{ann.summary || stripHtml(ann.content)}</p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{new Date(ann.createdAt).toLocaleDateString("zh-CN")}</span>
                      {ann.content.length > 100 && (
                        <button onClick={() => setExpandedId(expandedId === ann.id ? null : ann.id)} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
                          {expandedId === ann.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expandedId === ann.id ? "收起" : "展开"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => startEdit(ann)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="编辑">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => togglePinned(ann.id, ann.isPinned)} className={`rounded-lg p-1.5 transition-colors ${ann.isPinned ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`} title={ann.isPinned ? "取消置顶" : "置顶"}>
                      <Pin className="h-4 w-4" />
                    </button>
                    <button onClick={() => {
                      const next = ann.status === "published" ? "hidden" : "published"
                      toggleStatus(ann.id, next)
                    }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title={ann.status === "published" ? "隐藏" : "发布"}>
                      {ann.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setDeleteId(ann.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors" title="删除">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <ConfirmDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)} title="删除公告" description="确定要删除该公告吗？删除后无法恢复。" confirmText="删除" variant="destructive" onConfirm={() => deleteAnn(deleteId!)} />
      </div>

      {/* ── 右侧：实时预览 ── */}
      <div className="lg:w-[360px] shrink-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-xl bg-card p-4 ring-1 ring-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">首页卡片预览</p>
          <AnnouncePreview ann={previewAnn} />
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">移动端预览</p>
          <div className="mx-auto w-[280px] rounded-2xl overflow-hidden ring-1 ring-border bg-muted/30 p-2">
            <AnnouncePreview ann={previewAnn} compact />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 预览组件 ── */

function AnnouncePreview({ ann, compact }: { ann: { title: string; summary: string; content: string; imageUrl: string; isPinned: boolean }; compact?: boolean }) {
  const summary = ann.summary || stripHtml(ann.content).slice(0, 80)
  return (
    <div className={`rounded-xl overflow-hidden ring-1 ring-border ${compact ? "text-xs" : ""}`}>
      {/* 封面 */}
      <div className={`relative ${compact ? "h-24" : "h-32"} bg-muted`}>
        {ann.imageUrl ? (
          <Image src={ann.imageUrl} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-lg">🎮</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
        {ann.isPinned && (
          <div className="absolute top-2 left-2"><Badge variant="default" size="sm"><Pin className="h-3 w-3 mr-0.5" /> 置顶</Badge></div>
        )}
      </div>
      {/* 内容 */}
      <div className={`${compact ? "p-2.5" : "p-3.5"} bg-card`}>
        <h3 className={`font-bold text-foreground line-clamp-1 ${compact ? "text-sm" : "text-base"}`}>{ann.title || "公告标题"}</h3>
        {summary && <p className={`text-muted-foreground line-clamp-2 mt-1 ${compact ? "text-[11px]" : "text-xs"}`}>{summary}</p>}
        <span className={`inline-flex items-center gap-0.5 text-primary mt-2 ${compact ? "text-[10px]" : "text-xs"} font-medium`}>
          查看详情 <span className="inline-block">→</span>
        </span>
      </div>
    </div>
  )
}
