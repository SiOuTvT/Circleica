"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { adminBtnPrimary, adminBtnSecondary } from "@/lib/admin-styles"
import { AlertTriangle, Check, Database, Eye, EyeOff, HardDrive, Loader2, Mail, Save, Server, X, Zap } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface ServiceConfig {
  r2_account_id: string
  r2_access_key_id: string
  r2_secret_access_key: string
  r2_bucket_name: string
  r2_public_url: string
  redis_url: string
  redis_token: string
  resend_api_key: string
}

const EMPTY: ServiceConfig = {
  r2_account_id: "", r2_access_key_id: "", r2_secret_access_key: "",
  r2_bucket_name: "", r2_public_url: "",
  redis_url: "", redis_token: "",
  resend_api_key: "",
}

export default function ServicesPage() {
  const [config, setConfig] = useState<ServiceConfig>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({})
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    fetch("/api/admin/services")
      .then(r => r.json())
      .then(res => { if (res.data) setConfig(prev => ({ ...prev, ...res.data })) })
      .catch(() => toast.error("加载配置失败"))
      .finally(() => setLoading(false))
  }, [])

  const update = (key: keyof ServiceConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setTestResult(prev => { const next = { ...prev }; delete next[key.split("_")[0]]; return next })
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error()
      toast.success("配置已保存，重启应用后生效")
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }, [config])

  const handleTest = useCallback(async (service: "r2" | "redis") => {
    setTesting(service)
    setTestResult(prev => { const next = { ...prev }; delete next[service]; return next })
    try {
      const payload = service === "r2"
        ? { account_id: config.r2_account_id, access_key_id: config.r2_access_key_id, secret_access_key: config.r2_secret_access_key }
        : { url: config.redis_url, token: config.redis_token }
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", service, config: payload }),
      })
      const data = await res.json()
      setTestResult(prev => ({ ...prev, [service]: { ok: data.success, msg: data.message } }))
    } catch {
      setTestResult(prev => ({ ...prev, [service]: { ok: false, msg: "测试请求失败" } }))
    } finally {
      setTesting(null)
    }
  }, [config])

  const handleTestEmail = useCallback(async () => {
    if (!testEmail.trim()) { toast.error("请输入测试邮箱"); return }
    setSendingTest(true)
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", service: "email", config: { to: testEmail.trim(), api_key: config.resend_api_key } }),
      })
      const data = await res.json()
      setTestResult(prev => ({ ...prev, email: { ok: data.success, msg: data.message } }))
    } catch {
      setTestResult(prev => ({ ...prev, email: { ok: false, msg: "测试请求失败" } }))
    } finally {
      setSendingTest(false)
    }
  }, [config.resend_api_key, testEmail])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">服务配置</h1>
          <p className="text-sm text-muted-foreground mt-1">配置可选的外部服务，未配置时使用默认行为</p>
        </div>
        <button onClick={handleSave} disabled={saving} className={adminBtnPrimary}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存配置
        </button>
      </div>

      {/* key 强制重建：API 数据加载完成后重新挂载输入框，防止浏览器自动填充覆盖 */}
      <div key={loading ? "loading" : "ready"} className="space-y-6">

      {/* 重启提示 */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>服务配置保存后需要重启应用才能生效。环境变量中的配置优先级高于此处设置。</span>
      </div>

      {/* ── R2 对象存储 ── */}
      <Card className="p-6 space-y-4" style={{ borderRadius: "var(--radius-lg)" }}>
        <SectionHeader icon={HardDrive} title="Cloudflare R2 存储" desc="S3 兼容对象存储，用于游戏截图、用户头像等文件上传" testResult={testResult.r2} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account ID" value={config.r2_account_id} onChange={v => update("r2_account_id", v)} placeholder="Cloudflare 账户 ID" />
          <Field label="Bucket Name" value={config.r2_bucket_name} onChange={v => update("r2_bucket_name", v)} placeholder="存储桶名称" />
          <Field label="Access Key ID" value={config.r2_access_key_id} onChange={v => update("r2_access_key_id", v)} placeholder="R2 API Token ID" />
          <SecretField label="Secret Access Key" value={config.r2_secret_access_key} onChange={v => update("r2_secret_access_key", v)} placeholder="R2 API Token Secret" />
          <Field label="Public URL" value={config.r2_public_url} onChange={v => update("r2_public_url", v)} placeholder="https://pub-xxx.r2.dev" className="sm:col-span-2" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleTest("r2")} disabled={testing === "r2" || !config.r2_account_id} className={adminBtnSecondary}>
            {testing === "r2" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            测试连接
          </button>
          <span className="text-xs text-muted-foreground">验证 R2 凭证是否有效</span>
        </div>
        <p className="text-xs text-muted-foreground">未配置时文件存储在服务器本地 uploads 目录。</p>
      </Card>

      {/* ── Redis 缓存 ── */}
      <Card className="p-6 space-y-4" style={{ borderRadius: "var(--radius-lg)" }}>
        <SectionHeader icon={Database} title="Redis 缓存" desc="Upstash Redis REST API，用于缓存加速和速率限制" testResult={testResult.redis} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="REST URL" value={config.redis_url} onChange={v => update("redis_url", v)} placeholder="https://xxx.upstash.io" className="sm:col-span-2" />
          <SecretField label="REST Token" value={config.redis_token} onChange={v => update("redis_token", v)} placeholder="Upstash Redis Token" className="sm:col-span-2" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleTest("redis")} disabled={testing === "redis" || !config.redis_url} className={adminBtnSecondary}>
            {testing === "redis" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            测试连接
          </button>
          <span className="text-xs text-muted-foreground">发送 PING 验证连通性</span>
        </div>
        <p className="text-xs text-muted-foreground">未配置时使用内存缓存（LRU，最多 1000 条）。</p>
      </Card>

      {/* ── 邮件服务 ── */}
      <Card className="p-6 space-y-4" style={{ borderRadius: "var(--radius-lg)" }}>
        <SectionHeader icon={Mail} title="邮件服务" desc="Resend 邮件 API，用于密码重置等场景" testResult={testResult.email} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SecretField label="API Key" value={config.resend_api_key} onChange={v => update("resend_api_key", v)} placeholder="re_xxxxxxxxxxxx" className="sm:col-span-2" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
            placeholder="测试收件邮箱" className="w-56" />
          <button onClick={handleTestEmail} disabled={sendingTest || !config.resend_api_key || !testEmail} className={adminBtnSecondary}>
            {sendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            发送测试邮件
          </button>
        </div>
        <p className="text-xs text-muted-foreground">未配置时无法发送密码重置邮件，需管理员手动处理。</p>
      </Card>
      </div>
    </div>
  )
}

/* ── 子组件 ── */

function SectionHeader({ icon: Icon, title, desc, testResult }: {
  icon: React.ComponentType<{ className?: string }>
  title: string; desc: string
  testResult?: { ok: boolean; msg: string }
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      {testResult && (
        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${testResult.ok ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-500"}`}>
          {testResult.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {testResult.msg}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, disabled, className }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
  disabled?: boolean; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled} autoComplete="off" />
    </div>
  )
}

function SecretField({ label, value, onChange, placeholder, className }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; className?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <div className="relative">
        <Input type={visible ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className="pr-10" autoComplete="new-password" />
        <button type="button" onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
