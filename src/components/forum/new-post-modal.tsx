"use client"

import { useState, useCallback, useEffect, useRef, memo } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { RichTextEditor } from "../rich-text-editor-wrapper"

const CATEGORIES = [
  { value: "discussion", label: "讨论", icon: "💬" },
  { value: "help", label: "求档", icon: "🔍" },
  { value: "resource", label: "资源", icon: "📦" },
  { value: "offtopic", label: "杂谈", icon: "☕" },
]

interface NewPostModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (title: string, content: string, category: string) => Promise<void>
}

export function NewPostModal({ isOpen, onClose, onSubmit }: NewPostModalProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("discussion")
  const [submitting, setSubmitting] = useState(false)

  // 重置表单当打开时
  useEffect(() => {
    if (isOpen) {
      setTitle("")
      setContent("")
      setCategory("discussion")
    }
  }, [isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    await onSubmit(title.trim(), content.trim(), category)
    setSubmitting(false)
    setTitle("")
    setContent("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-card p-6 ring-1 ring-border">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">发布新帖</h2>
          <button onClick={onClose} aria-label="关闭" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 分类选择 */}
          <div className="flex gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1",
                  category === cat.value ? "bg-primary text-primary-foreground ring-primary" : "bg-secondary text-muted-foreground ring-border"
                )}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* 标题输入 */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题（如：求《xxx》下载地址）"
            maxLength={100}
            required
            className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all"
          />

          {/* 内容编辑器 */}
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="详细描述你的需求… 支持富文本格式和图片上传"
          />

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "发布中…" : "发 布"}
          </button>
        </form>
      </div>
    </div>
  )
}