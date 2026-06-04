"use client"

import { Image as ImageIcon, Save, Settings, Trash2, Upload } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export default function SiteSettingsPage() {
  const [placeholderUrl, setPlaceholderUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => { setPlaceholderUrl(data.default_placeholder_image || "") })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_placeholder_image: placeholderUrl }),
      })
      toast.success("已保存")
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }, [placeholderUrl])

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json()
      if (data.url) {
        setPlaceholderUrl(data.url)
      } else {
        toast.error("上传失败: " + (data.error || "未知错误"))
      }
    } catch {
      toast.error("上传失败")
    } finally {
      setUploading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-pulse rounded bg-muted" />
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          <div className="flex items-center gap-4">
            <div className="h-40 w-28 animate-pulse rounded-lg bg-muted" />
            <div className="flex flex-col gap-2">
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
          <div className="h-9 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-xl font-bold">站点设置</h1>
      </div>

      {/* 默认占位图 */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">默认占位图</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          当游戏没有封面时使用此图片。留空则使用前端默认的 SVG 占位图。
        </p>

        {/* 预览 */}
        <div className="flex items-center gap-4">
          <div className="relative h-40 w-28 overflow-hidden rounded-lg border border-border bg-muted">
            {placeholderUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={placeholderUrl} alt="占位图预览" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleUpload(f)
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "上传中…" : "上传图片"}
            </button>
            {placeholderUrl && (
              <button
                onClick={() => setPlaceholderUrl("")}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                清除
              </button>
            )}
          </div>
        </div>

        {/* 手动输入 URL */}
        <div>
          <label className="mb-1 block text-sm font-medium">或手动输入图片 URL</label>
          <input
            value={placeholderUrl}
            onChange={e => setPlaceholderUrl(e.target.value)}
            placeholder="https://example.com/placeholder.png"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "保存中…" : "保存设置"}
        </button>
      </div>
    </div>
  )
}
