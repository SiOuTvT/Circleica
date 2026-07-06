"use client"

import { useState, useCallback, useEffect } from "react"
import { Loader2, Plus, X, MessageCircle, HelpCircle, Package, Coffee } from "lucide-react"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import { RichTextEditor } from "../rich-text-editor-wrapper"
import type { ComponentType, SVGProps } from "react"

type IconType = ComponentType<SVGProps<SVGSVGElement>>

const CATEGORIES: { value: string; label: string; icon: IconType }[] = [
  { value: "discussion", label: "讨论", icon: MessageCircle },
  { value: "help", label: "求档", icon: HelpCircle },
  { value: "resource", label: "资源", icon: Package },
  { value: "offtopic", label: "杂谈", icon: Coffee },
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
    try {
      await onSubmit(title.trim(), content.trim(), category)
      setTitle("")
      setContent("")
      onClose()
    } catch (err) {
      logger.forum.warn("[NewPostModal] submit post failed", { error: err instanceof Error ? err.message : String(err) })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-t-2xl sm:rounded-2xl bg-card p-5 sm:p-6 ring-1 ring-border max-h-[90dvh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">发布新帖</h2>
          <button onClick={onClose} aria-label="关闭" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 分类选择 */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1 flex items-center gap-1.5",
                  category === cat.value ? "bg-primary text-primary-foreground ring-primary" : "bg-secondary text-muted-foreground ring-border"
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} /> {cat.label}
              </button>
              )
            })}
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
            {submitting ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" />发布中…</span> : "发 布"}
          </button>
        </form>
      </div>
    </div>
  )
}