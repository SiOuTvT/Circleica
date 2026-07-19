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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
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
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      {/* ── 左侧：编辑区域 ── */}
      <div className="flex-1 min-w-0 w-full space-y-5">

        {/* 表单卡片 */}
        <section className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
          {/* 卡片头部 */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              {isEditing ? "编辑公告" : "新建公告"}
            </h2>
            {isEditing && (
              <button type="button" onClick={cancelEdit}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" /> 取消编辑
              </button>
            )}
          </div>

          <div className="p-5 space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/8 px-3.5 py-2.5 text-xs text-red-500 ring-1 ring-red-500/15">
                <span className="shrink-0">⚠</span> {error}
              </div>
            )}
            {showDraftBanner && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-500/8 px-3.5 py-2.5 text-xs text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/15">
                <span>检测到草稿「{draft.title || "无标题"}」</span>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={restoreDraft}
                    className="rounded-md bg-amber-500/15 px-2.5 py-1 font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-colors">恢复</button>
                  <button type="button" onClick={() => { clearDraft(); setDraftRestored(true) }}
                    className="rounded-md px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors">丢弃</button>
                </div>
              </div>
            )}

            <form onSubmit={submitAnn} className="space-y-4">
              {/* 标题 — 全宽 */}
              <Field label="标题" required>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="输入公告标题…" required className={inputCls} />
              </Field>

              {/* 摘要 + 封面图 — 左右并排 */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4 items-start">
                <Field label="摘要" hint="不填则自动截取正文">
                  <textarea value={summary} onChange={e => setSummary(e.target.value)}
                    placeholder="一句话概括公告内容…" rows={3} className={inputCls + " resize-none"} />
                </Field>
                <Field label="封面">
                  <div className="rounded-xl overflow-hidden ring-1 ring-border bg-muted/40">
                    <ImageUpload value={imageUrl} onChange={setImageUrl} aspectRatio={16 / 9} maxSizeMB={5} placeholder="上传" />
                  </div>
                </Field>
              </div>

              {/* 正文 */}
              <Field label="正文" required>
                <RichTextEditor content={content} onChange={setContent} placeholder="公告正文，支持富文本…" />
              </Field>

              {/* 状态 + 置顶 + 链接 — 一行 */}
              <div className="grid grid-cols-1 sm:grid-cols-[140px_auto_1fr] gap-3 items-end">
                <Field label="状态">
                  <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls + " cursor-pointer"}>
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                    <option value="hidden">已隐藏</option>
                  </select>
                </Field>
                <label className="flex items-center gap-2 pb-0.5 cursor-pointer select-none group">
                  <span className="relative inline-flex">
                    <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="peer sr-only" />
                    <span className="h-5 w-5 rounded-md ring-1 ring-border bg-muted transition-all peer-checked:bg-primary peer-checked:ring-primary flex items-center justify-center">
                      {isPinned && <Pin className="h-3 w-3 text-primary-foreground" />}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">置顶</span>
                </label>
                <Field label="外部链接">
                  <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://…（选填）" className={inputCls} />
                </Field>
              </div>

              {/* 定时 — 两列 */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="定时上线">
                  <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={inputCls} />
                </Field>
                <Field label="定时下线">
                  <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className={inputCls} />
                </Field>
              </div>

              {/* 提交 */}
              <div className="pt-1">
                <button type="submit" disabled={adding}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                  {adding
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> {isEditing ? "保存中…" : "创建中…"}</>
                    : isEditing
                      ? <><Pencil className="h-4 w-4" /> 保存修改</>
                      : <><Plus className="h-4 w-4" /> 创建公告</>}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ── 公告列表 ── */}
        <section className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
            <p className="text-xs text-muted-foreground font-medium">
              共 {anns.length} 条公告
            </p>
            <p className="text-[11px] text-muted-foreground/60">拖拽排序</p>
          </div>

          {anns.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="text-3xl mb-2 opacity-30">📢</div>
              <p className="text-sm">暂无公告</p>
            </div>
          )}

          <div className="divide-y divide-border/60">
            {anns.map(ann => (
              <div key={ann.id}
                draggable
                onDragStart={e => handleDragStart(e, ann.id)} onDragEnd={handleDragEnd}
                onDragOver={e => handleDragOver(e, ann.id)} onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, ann.id)}
                className={`group/item transition-colors hover:bg-accent/40
                  ${draggingId === ann.id ? "opacity-30" : ""}
                  ${dragOverId === ann.id && draggingId !== ann.id ? "border-t-[3px] border-primary" : ""}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Drag handle */}
                  <div className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/40 group-hover/item:text-muted-foreground transition-colors">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* 缩略图 */}
                  <div className="w-14 h-8 shrink-0 rounded-md overflow-hidden bg-muted ring-1 ring-border/50">
                    {ann.imageUrl
                      ? <Image src={ann.imageUrl} alt="" width={56} height={32} className="w-full h-full object-cover" unoptimized />
                      : <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground/40">🎮</div>}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {ann.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                      <Badge variant={STATUS_VARIANTS[ann.status] ?? "secondary"} size="sm">
                        {STATUS_LABELS[ann.status] ?? ann.status}
                      </Badge>
                      <span className="text-sm font-medium text-foreground truncate">{ann.title}</span>
                    </div>
                    {expandedId === ann.id ? (
                      <div className="mt-1.5"><RichTextContent html={ann.content} /></div>
                    ) : (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{ann.summary || stripHtml(ann.content)}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/60">
                      <span>{formatDate(ann.createdAt)}</span>
                      {ann.content.length > 100 && (
                        <button onClick={() => setExpandedId(expandedId === ann.id ? null : ann.id)}
                          className="flex items-center gap-0.5 hover:text-foreground transition-colors">
                          {expandedId === ann.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expandedId === ann.id ? "收起" : "展开"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 — hover 才显示 */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <IconBtn onClick={() => startEdit(ann)} title="编辑"><Pencil className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn onClick={() => togglePinned(ann.id, ann.isPinned)} title={ann.isPinned ? "取消置顶" : "置顶"}
                      active={ann.isPinned}><Pin className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn onClick={() => toggleStatus(ann.id, ann.status === "published" ? "hidden" : "published")}
                      title={ann.status === "published" ? "隐藏" : "发布"}>
                      {ann.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </IconBtn>
                    <IconBtn onClick={() => setDeleteId(ann.id)} title="删除" variant="danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <ConfirmDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}
          title="删除公告" description="确定要删除该公告吗？此操作不可恢复。"
          confirmText="删除" variant="destructive" onConfirm={() => deleteAnn(deleteId!)} />
      </div>

      {/* ── 右侧：实时预览 ── */}
      <aside className="w-full xl:w-[340px] shrink-0 xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground">前台效果预览</p>
          </div>
          <div className="p-4">
            <PreviewCard ann={previewAnn} />
          </div>
        </div>
      </aside>
    </div>
  )
}

/* ── 子组件 ── */

const inputCls =
  "w-full rounded-xl bg-muted/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border/80 outline-none transition-all focus:bg-muted focus:ring-2 focus:ring-ring/40"

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-primary">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/50">{hint}</p>}
    </div>
  )
}

function IconBtn({ children, onClick, title, active, variant }: {
  children: React.ReactNode; onClick: () => void; title: string; active?: boolean; variant?: "danger"
}) {
  return (
    <button onClick={onClick} title={title}
      className={`rounded-lg p-1.5 transition-colors ${
        variant === "danger"
          ? "text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
          : active
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}>
      {children}
    </button>
  )
}

/* ── 预览卡片 ── */

function PreviewCard({ ann }: { ann: { title: string; summary: string; content: string; imageUrl: string; isPinned: boolean } }) {
  const summary = ann.summary || stripHtml(ann.content).slice(0, 80)
  return (
    <div className="relative rounded-xl overflow-hidden ring-1 ring-border/50">
      {/* 封面 */}
      <div className="relative aspect-video bg-muted/60">
        {ann.imageUrl ? (
          <Image src={ann.imageUrl} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg text-muted-foreground/30">📢</div>
          </div>
        )}
        {/* 渐变遮罩 — 和前台 announce-swiper 一致 */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        {ann.isPinned && (
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm">
              <Pin className="h-2.5 w-2.5" /> 置顶
            </span>
          </div>
        )}
      </div>
      {/* 毛玻璃信息卡片 — 和前台一致 */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="backdrop-blur-md bg-black/35 rounded-lg ring-1 ring-white/[0.08] px-3 py-2.5 space-y-1.5">
          {/* 作者行 */}
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-white/15 flex items-center justify-center text-[9px] font-bold text-white/70">F</div>
            <span className="text-[11px] font-medium text-white/80">Fangame</span>
          </div>
          {/* 标题 */}
          <h3 className="font-bold text-white text-sm leading-snug line-clamp-1">
            {ann.title || "公告标题"}
          </h3>
          {/* 摘要 */}
          {summary && (
            <p className="text-[11px] text-white/60 line-clamp-1 leading-relaxed">{summary}</p>
          )}
          {/* 查看详情 */}
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-white/70">
            查看详情 <span>→</span>
          </span>
        </div>
      </div>
    </div>
  )
}
