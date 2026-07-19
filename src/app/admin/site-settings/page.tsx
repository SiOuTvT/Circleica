"use client"

import { AdminPageContainer } from "@/components/admin-page-container"
import { Card } from "@/components/ui/card"
import { adminInput } from "@/lib/admin-styles"
import { Globe, Image as ImageIcon, Loader2, Save, Settings, Shield, Trash2, Upload } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export default function SiteSettingsPage() {
  const [placeholderUrl, setPlaceholderUrl] = useState("")
  const [siteName, setSiteName] = useState("")
  const [siteDescription, setSiteDescription] = useState("")
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(false)
  const [emailVerificationRequiredForLogin, setEmailVerificationRequiredForLogin] = useState(false)
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false)
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
        setEmailVerificationEnabled(data.email_verification_enabled === "true")
        setEmailVerificationRequiredForLogin(data.email_verification_required_for_login === "true")
        setSendWelcomeEmail(data.send_welcome_email === "true")
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
          email_verification_enabled: String(emailVerificationEnabled),
          email_verification_required_for_login: String(emailVerificationRequiredForLogin),
          send_welcome_email: String(sendWelcomeEmail),
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
  }, [placeholderUrl, siteName, siteDescription, registrationEnabled, emailVerificationEnabled, emailVerificationRequiredForLogin, sendWelcomeEmail])

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
      <AdminPageContainer>
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-pulse rounded bg-muted" />
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
        </div>
        <Card size="comfortable" radius="xl" className="space-y-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </Card>
        <Card size="comfortable" radius="xl" className="space-y-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </Card>
        <Card size="comfortable" radius="xl" className="space-y-4">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="flex items-center gap-4">
            <div className="h-40 w-28 animate-pulse rounded-lg bg-muted" />
            <div className="flex flex-col gap-2">
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-9 w-full animate-pulse rounded bg-muted" />
        </Card>
      </AdminPageContainer>
    )
  }

  return (
    <AdminPageContainer width="narrow">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">站点设置</h1>
      </div>

      {/* 站点信息 */}
      <Card size="comfortable" radius="xl" className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">站点信息</h2>
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
        </Card>

      {/* 注册设置 */}
      <Card size="comfortable" radius="xl" className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">注册设置</h2>
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
                registrationEnabled ? "translate-x-5" : "translate-x-0.5"
              } mt-0.5`}
            />
          </button>
        </div>
        </Card>

      {/* 邮件验证设置 */}
      <Card size="comfortable" radius="xl" className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">邮件验证</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          控制注册邮箱验证行为。需要先在「服务配置」中配置邮件服务。
        </p>

        <div className="space-y-3">
          <ToggleRow
            label="开启邮箱验证"
            desc="新注册用户需要验证邮箱"
            checked={emailVerificationEnabled}
            onChange={setEmailVerificationEnabled}
          />
          {emailVerificationEnabled && (
            <>
              <ToggleRow
                label="登录必须验证邮箱"
                desc="未验证邮箱的用户无法登录（已注册的老用户不受影响）"
                checked={emailVerificationRequiredForLogin}
                onChange={setEmailVerificationRequiredForLogin}
              />
              <ToggleRow
                label="发送欢迎邮件"
                desc="新用户注册后发送欢迎邮件"
                checked={sendWelcomeEmail}
                onChange={setSendWelcomeEmail}
              />
            </>
          )}
        </div>
        </Card>

      {/* 默认占位图 */}
      <Card size="comfortable" radius="xl" className="space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">默认占位图</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          当游戏没有封面时使用此图片。留空则使用前端默认的 SVG 占位图。
        </p>

        {/* 预览 */}
        <div className="flex items-center gap-4">
          <div className="relative h-40 w-28 overflow-hidden rounded-lg border border-border bg-muted">
            {placeholderUrl ? (
              <Image src={placeholderUrl} alt="占位图预览" fill className="object-cover" unoptimized />
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
        </Card>

      {/* 统一保存按钮 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "保存中…" : "保存所有设置"}
      </button>
    </AdminPageContainer>
  )
}

function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 ring-1 ring-border">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          } mt-0.5`}
        />
      </button>
    </div>
  )
}
