"use client"

import { ImageUpload } from "@/components/image-upload"
import { RichTextContent } from "@/components/rich-text-content"
import { RichTextEditor } from "@/components/rich-text-editor"
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

/** 去除 HTML 标签，返回纯文本 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
}

interface Ann { id: string; title: string; content: string; imageUrl: string; link: string; isActive: boolean; createdAt: string }

export function AnnouncementsManager({ initialAnns }: { initialAnns: Ann[] }) {
  const [anns, setAnns] = useState(initialAnns)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [link, setLink] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const inputCls = "w-full rounded-xl bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring transition-all"

  async function addAnn(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setAdding(true)
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content: content.trim(), imageUrl, link: link.trim() }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setError(data.error); return }
    setAnns((prev) => [{ ...data, createdAt: data.createdAt }, ...prev])
    setTitle(""); setContent(""); setImageUrl(""); setLink("")
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
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" })
    setAnns((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* 新增表单 */}
      <div className="rounded-2xl bg-card p-5 ring-1 ring-border">
        <h2 className="mb-4 text-sm font-semibold text-foreground">发布公告</h2>
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">{error}</p>}
        <form onSubmit={addAnn} className="space-y-3">
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
          <button type="submit" disabled={adding}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-60">
            {adding ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} /> : <Plus className="h-5 w-5" strokeWidth={2} />}
            {adding ? "发布中…" : "发布公告"}
          </button>
        </form>
      </div>

      {/* 公告列表 */}
      <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">共 {anns.length} 条公告</p>
        </div>
        <div className="divide-y divide-border">
          {anns.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">暂无公告</p>}
          {anns.map((ann) => (
            <div key={ann.id} className="px-4 py-3 hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between gap-3">
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
                  <button onClick={() => toggleActive(ann.id, ann.isActive)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    {ann.isActive ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
                  </button>
                  <button onClick={() => deleteAnn(ann.id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
