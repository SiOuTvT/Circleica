"use client"

import { adminInput } from "@/lib/admin-styles"
import { Globe, Image as ImageIcon, Save, Settings, Shield, Trash2, Upload } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export default function SiteSettingsPage() {
  const [placeholderUrl, setPlaceholderUrl] = useState("")
  const [siteName, setSiteName] = useState("")
  const [siteDescription, setSiteDescription] = useState("")
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => {
        setPlaceholderUrl(data.default_placeholder_image || "")
        setSiteName(data.site_name || "")
        setSiteDescription(data.site_description || "")
        setRegistrationEnabled(data.registration_enabled !== "false")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_placeholder_image: placeholderUrl,
          site_name: siteName,
          site_description: siteDescription,
          registration_enabled: String(registrationEnabled),
        }),
      })
      if (!res.ok) {
        toast.error("保存失败")
      } else {
        toast.success("已保存")
      }
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }, [placeholderUrl, siteName, siteDescription, registrationEnabled])

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
        <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="flex items-center gap-4">
            <div className="h-40 w-28 animate-pulse rounded-lg bg-muted" />
            <div className="flex flex-col gap-2">
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">站点设置</h1>
      </div>

      {/* 站点信息 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">站点信息</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          配置站点的基本信息，如名称和描述。
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">站点名称</label>
            <input
              value={siteName}
              onChange={e => setSiteName(e.target.value)}
              placeholder="我的站点"
              className={adminInput}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">站点描述</label>
            <input
              value={siteDescription}
              onChange={e => setSiteDescription(e.target.value)}
              placeholder="站点的简短描述"
              className={adminInput}
            />
          </div>
        </div>
      </div>

      {/* 注册设置 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">注册设置</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          控制是否允许新用户注册。
        </p>

        <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 ring-1 ring-border">
          <div>
            <p className="text-sm font-medium">开放注册</p>
            <p className="text-xs text-muted-foreground">关闭后新用户将无法注册账号</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={registrationEnabled}
            onClick={() => setRegistrationEnabled(!registrationEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
              registrationEnabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                registrationEnabled ? "translate-x-5.5" : "translate-x-0.5"
              } mt-0.5`}
            />
          </button>
        </div>
      </div>

      {/* 默认占位图 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
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
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "上传中…" : "上传图片"}
            </button>
            {placeholderUrl && (
              <button
                onClick={() => setPlaceholderUrl("")}
                className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
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
            className={adminInput}
          />
        </div>
      </div>

      {/* 统一保存按钮 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "保存中…" : "保存所有设置"}
      </button>
    </div>
  )
}
