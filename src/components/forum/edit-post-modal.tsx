"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import { RichTextEditor } from "../rich-text-editor-wrapper"
import type { Post } from "./forum-client-root"

interface EditPostModalProps {
  post: Post | null
  onClose: () => void
  onSave: (id: string, title: string, content: string) => Promise<void>
}

export function EditPostModal({ post, onClose, onSave }: EditPostModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // 初始化编辑器内容
  useEffect(() => {
    if (post) {
      setTitle(post.title)
      setContent(post.content)
    }
  }, [post])

  if (!post) return null

  async function handleSubmit() {
    if (!post || !title.trim() || !content.trim()) return
    setSubmitting(true)
    try {
      await onSave(post.id, title.trim(), content.trim())
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败，请稍后再试")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-card p-6 ring-1 ring-border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">编辑帖子</h2>
          <button onClick={onClose} aria-label="关闭" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题"
            maxLength={100}
            required
            className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all"
          />
          <RichTextEditor content={content} onChange={setContent} placeholder="内容" />
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-muted-foreground ring-1 ring-border transition-all hover:text-foreground"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}