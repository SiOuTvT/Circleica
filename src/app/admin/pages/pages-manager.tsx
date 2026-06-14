"use client"

import { RichTextContent } from "@/components/rich-text-content-wrapper"
import { Loader2, Pencil, Save, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { StructuredEditor } from "./structured-editor"

const PAGES = [
  { key: "page_about", label: "关于", href: "/about" },
  { key: "page_rules", label: "社区规则", href: "/rules" },
  { key: "page_contact", label: "联系我们", href: "/contact" },
]

interface Props {
  initial: Record<string, string>
}

export function PagesManager({ initial }: Props) {
  const [contents, setContents] = useState(initial)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  function startEdit(key: string) {
    setEditingKey(key)
    setDraft(initial[key] ?? "")
  }

  function cancelEdit() {
    setEditingKey(null)
    setDraft("")
  }

  async function save(key: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: draft }),
      })
      if (res.ok) {
        setContents(prev => ({ ...prev, [key]: draft }))
        toast.success("已保存")
        cancelEdit()
      } else {
        toast.error("保存失败")
      }
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {PAGES.map(page => (
        <div key={page.key} className="rounded-xl bg-card ring-1 ring-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{page.label}</h3>
              <a href={page.href} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-mono">
                {page.href} ↗
              </a>
            </div>
            {editingKey === page.key ? (
              <div className="flex items-center gap-1.5">
                <button onClick={cancelEdit}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3 w-3" />取消
                </button>
                <button onClick={() => save(page.key)} disabled={saving}
                  className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}保存
                </button>
              </div>
            ) : (
              <button onClick={() => startEdit(page.key)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ring-1 ring-border">
                <Pencil className="h-3 w-3" />编辑
              </button>
            )}
          </div>

          <div className="px-5 pb-5">
            {editingKey === page.key ? (
              <StructuredEditor html={draft} onChange={setDraft} />
            ) : (
              <div className="rounded-2xl bg-card ring-1 ring-border p-6">
                {contents[page.key] ? (
                  <RichTextContent html={contents[page.key]} />
                ) : (
                  <p className="text-xs text-muted-foreground italic">暂无自定义内容，页面将显示默认内容</p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
