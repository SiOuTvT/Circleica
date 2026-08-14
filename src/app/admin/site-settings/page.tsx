"use client"

import { AdminPageContainer } from "@/components/admin-page-container"
import { Card } from "@/components/ui/card"
import { adminInput } from "@/lib/admin-styles"
import { Globe, Image as ImageIcon, Loader2, Save, Shield, Trash2, Upload } from "lucide-react"
import Image from "next/image"
import { BrandLogo } from "@/components/brand-logo"
import { BRANDING, resolveLogo } from "@/lib/branding"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"

export default function SiteSettingsPage() {
  const [placeholderUrl, setPlaceholderUrl] = useState("")
  const [siteName, setSiteName] = useState("")
  const [siteDescription, setSiteDescription] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [logoMode, setLogoMode] = useState<"full" | "icon">("full")
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState(false)
  const [emailVerificationRequiredForLogin, setEmailVerificationRequiredForLogin] = useState(false)
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiFetchSafe<{ data?: {
      default_placeholder_image?: string
      site_name?: string
      site_description?: string
      site_logo?: string
      logo_mode?: string
      registration_enabled?: string
      email_verification_enabled?: string
      email_verification_required_for_login?: string
      send_welcome_email?: string
    }}>("/api/admin/settings")
      .then(({ ok, data }) => {
        const s = data?.data
        if (ok && s) {
          setPlaceholderUrl(s.default_placeholder_image || "")
          setSiteName(s.site_name || "")
          setSiteDescription(s.site_description || "")
          setLogoUrl(s.site_logo || "")
          setLogoMode(s.logo_mode === "icon" ? "icon" : "full")
          setRegistrationEnabled(s.registration_enabled !== "false")
          setEmailVerificationEnabled(s.email_verification_enabled === "true")
          setEmailVerificationRequiredForLogin(s.email_verification_required_for_login === "true")
          setSendWelcomeEmail(s.send_welcome_email === "true")
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const { ok } = await apiFetchSafe("/api/admin/settings", {
        method: "PUT",
        body: {
          default_placeholder_image: placeholderUrl,
          site_name: siteName,
          site_description: siteDescription,
          site_logo: logoUrl,
          logo_mode: logoMode,
          registration_enabled: String(registrationEnabled),
          email_verification_enabled: String(emailVerificationEnabled),
          email_verification_required_for_login: String(emailVerificationRequiredForLogin),
          send_welcome_email: String(sendWelcomeEmail),
        },
      })
      if (!ok) {
        toast.error("保存失败")
      } else {
        toast.success("已保存")
      }
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }, [placeholderUrl, siteName, siteDescription, logoUrl, logoMode, registrationEnabled, emailVerificationEnabled, emailVerificationRequiredForLogin, sendWelcomeEmail])

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

  const handleLogoUpload = useCallback(async (file: File) => {
    setLogoUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json()
      if (data.url) {
        setLogoUrl(data.url)
        // 上传自定义图后自动切到「完整 Logo」以便即时看到效果
        setLogoMode("full")
      } else {
        toast.error("上传失败: " + (data.error || "未知错误"))
      }
    } catch {
      toast.error("上传失败")
    } finally {
      setLogoUploading(false)
    }
  }, [])

  // 品牌 Logo 预览：根据当前「显示模式」与「自定义图」解析应渲染的图
  const brandOpts = {
    emblem: BRANDING.circleica.emblem,
    emblemWhite: BRANDING.circleica.emblemWhite,
    lockup: BRANDING.circleica.lockup,
    lockupWhite: BRANDING.circleica.lockupWhite,
    siteLogo: logoUrl,
  }
  const previewBrand = resolveLogo(logoMode, brandOpts)
  const fullThumb = resolveLogo("full", brandOpts)
  const iconThumb = resolveLogo("icon", brandOpts)
  const previewLogoClass = logoMode === "icon" ? "h-10 w-10" : "h-9 w-auto max-w-[200px]"

  if (loading) {
    return (
      <AdminPageContainer>
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-pulse rounded bg-muted" />
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
        </div>
        <Card size="comfortable" radius="xl">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </Card>
        <Card size="comfortable" radius="xl">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </Card>
        <Card size="comfortable" radius="xl">
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
    <AdminPageContainer
      title="站点设置"
      eyebrow="SETTINGS"
      description="管理站点名称、品牌 Logo、注册开关与邮件验证等基础设置。"
    >
      {/* 站点信息 */}
      <Card size="comfortable" radius="xl">
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

      {/* 品牌 Logo */}
      <Card size="comfortable" radius="xl">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">品牌 Logo</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          自定义站点 Logo 与显示模式。设置即时同步到顶部导航、侧边栏和页脚。
        </p>

        {/* 自定义 Logo 上传 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium">自定义 Logo 图</label>
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              {logoUrl ? (
                <Image src={logoUrl} alt="自定义 Logo 预览" fill sizes="64px" className="object-contain p-1" unoptimized />
              ) : (
                <Image src={BRANDING.circleica.emblem} alt="默认 emblem" fill sizes="64px" className="object-contain p-1.5" unoptimized />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleLogoUpload(f)
                }}
              />
              <button
                onClick={() => logoFileRef.current?.click()}
                disabled={logoUploading}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {logoUploading ? "上传中…" : "上传图片"}
              </button>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl("")}
                  className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  清除（恢复默认 emblem）
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">或手动输入图片 URL</label>
            <input
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className={adminInput}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            建议透明底 PNG（约 2048×2048）。留空则使用默认品牌 emblem。仅在「完整 Logo」模式下显示。
          </p>
        </div>

        {/* 实时预览：浅色 / 深色导航栏对比，切换显示模式或上传自定义图后即时更新 */}
        <div className="space-y-2 border-t border-border pt-4">
          <label className="block text-sm font-medium">实时预览</label>
          <div className="flex flex-wrap gap-3">
            <div className="flex h-20 w-[240px] items-center justify-center rounded-xl border border-border bg-[#f4f4f5] px-4">
              <BrandLogo brand={previewBrand} forceVariant="light" alt="" className={previewLogoClass} />
            </div>
            <div className="flex h-20 w-[240px] items-center justify-center rounded-xl border border-border bg-[#15151b] px-4">
              <BrandLogo brand={previewBrand} forceVariant="dark" alt="" className={previewLogoClass} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            左：浅色导航栏预览　右：深色导航栏预览。切换下方「显示模式」或上传自定义图后即时更新。
          </p>
        </div>

        {/* 显示模式 */}
        <div className="space-y-2 border-t border-border pt-4">
          <label className="block text-sm font-medium">显示模式</label>
          <div
            role="radiogroup"
            aria-label="Logo 显示模式"
            className="inline-flex rounded-xl border border-border bg-muted p-1"
          >
            <button
              type="button"
              role="radio"
              aria-checked={logoMode === "full"}
              onClick={() => setLogoMode("full")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                logoMode === "full" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BrandLogo brand={fullThumb} forceVariant="light" alt="" className="h-5 w-auto max-w-[88px]" />
              完整 Logo
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={logoMode === "icon"}
              onClick={() => setLogoMode("icon")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                logoMode === "icon" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BrandLogo brand={iconThumb} forceVariant="light" alt="" className="h-5 w-5" />
              仅图标
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            「仅图标」模式三处统一只显示 emblem 符号，不显示站名与自定义图；Galvelica 副站同步此模式。
          </p>
        </div>
        </Card>

      {/* 注册设置 */}
      <Card size="comfortable" radius="xl">
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
      <Card size="comfortable" radius="xl">
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
      <Card size="comfortable" radius="xl">
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
              <Image src={placeholderUrl} alt="占位图预览" fill sizes="112px" className="object-cover" unoptimized />
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
