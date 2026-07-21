"use client"

import { AdminPageContainer } from "@/components/admin-page-container"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PROVIDER_FIELDS, PROVIDER_LABELS } from "@/lib/email-providers"
import { adminBtnPrimary, adminBtnSecondary } from "@/lib/admin-styles"
import { AlertTriangle, Check, Database, Eye, EyeOff, HardDrive, Loader2, Mail, Save, X, Zap } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

const AVAILABLE_PROVIDERS = Object.keys(PROVIDER_LABELS)

interface ServiceConfig {
  r2_account_id: string
  r2_access_key_id: string
  r2_secret_access_key: string
  r2_bucket_name: string
  r2_public_url: string
  redis_url: string
  redis_token: string
  email_providers: Record<string, Record<string, string>>
  email_provider_order: string
}

const EMPTY: ServiceConfig = {
  r2_account_id: "", r2_access_key_id: "", r2_secret_access_key: "",
  r2_bucket_name: "", r2_public_url: "",
  redis_url: "", redis_token: "",
  email_providers: {},
  email_provider_order: "",
}

interface TestResult { ok: boolean; msg: string }
interface EmailTestResults { success?: boolean; message?: string; error?: string; results?: Array<{ provider: string; label: string; ok: boolean; msg: string }> }

export default function ServicesPage() {
  const [config, setConfig] = useState<ServiceConfig>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, TestResult>>({})
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    fetch("/api/admin/services")
      .then(r => r.json())
      .then(res => {
        if (res.data) {
          const d = res.data
          setConfig(prev => ({
            ...prev,
            r2_account_id: String(d.r2_account_id ?? ""),
            r2_access_key_id: String(d.r2_access_key_id ?? ""),
            r2_secret_access_key: String(d.r2_secret_access_key ?? ""),
            r2_bucket_name: String(d.r2_bucket_name ?? ""),
            r2_public_url: String(d.r2_public_url ?? ""),
            redis_url: String(d.redis_url ?? ""),
            redis_token: String(d.redis_token ?? ""),
            email_providers: (typeof d.email_providers === "object" && d.email_providers !== null) ? d.email_providers : {},
            email_provider_order: String(d.email_provider_order ?? ""),
          }))
        }
      })
      .catch(() => toast.error("加载配置失败"))
      .finally(() => { setLoading(false); setReady(true) })
  }, [])

  // R2/Redis 字段更新
  const updateService = (key: keyof Pick<ServiceConfig, "r2_account_id" | "r2_access_key_id" | "r2_secret_access_key" | "r2_bucket_name" | "r2_public_url" | "redis_url" | "redis_token">, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  // Provider 配置更新
  const updateProviderField = (providerId: string, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      email_providers: {
        ...prev.email_providers,
        [providerId]: { ...(prev.email_providers[providerId] || {}), [field]: value },
      },
    }))
  }

  // Provider 优先级更新
  const updateProviderOrder = (order: string[]) => {
    setConfig(prev => ({ ...prev, email_provider_order: order.filter(Boolean).join(",") }))
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          email_providers: config.email_providers,
          email_provider_order: config.email_provider_order,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.data?.success === false) throw new Error(data.data?.message)
      toast.success("配置已保存，重启应用后生效")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败")
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
      const result = data.data || data
      setTestResult(prev => ({ ...prev, [service]: { ok: !!result.success, msg: result.message || result.error || "未知结果" } }))
    } catch {
      setTestResult(prev => ({ ...prev, [service]: { ok: false, msg: "测试请求失败" } }))
    } finally {
      setTesting(null)
    }
  }, [config])

  const handleTestEmail = useCallback(async () => {
    if (!testEmail.trim()) { toast.error("请输入测试邮箱"); return }
    setSendingTest(true)
    setTestResult(prev => { const next = { ...prev }; delete next.email; return next })
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test", service: "email",
          config: {
            to: testEmail.trim(),
            email_providers: JSON.stringify(config.email_providers),
            email_provider_order: config.email_provider_order,
          },
        }),
      })
      const data = await res.json()
      const result: EmailTestResults = data.data || data
      setTestResult(prev => ({
        ...prev,
        email: {
          ok: !!result.success,
          msg: result.message || result.error || "未知结果",
          results: result.results,
        } as TestResult & { results?: Array<{ provider: string; label: string; ok: boolean; msg: string }> },
      }))
    } catch {
      setTestResult(prev => ({ ...prev, email: { ok: false, msg: "测试请求失败" } }))
    } finally {
      setSendingTest(false)
    }
  }, [config.email_providers, config.email_provider_order, testEmail])

  const providerOrder = config.email_provider_order
    ? config.email_provider_order.split(",").map(s => s.trim()).filter(Boolean)
    : []
  const hasAnyEmailProvider = Object.keys(config.email_providers).some(id => {
    const cfg = config.email_providers[id]
    return cfg && (cfg.apiKey || cfg.host)
  })

  if (loading) {
    return (
      <AdminPageContainer title="服务配置">
        {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />)}
      </AdminPageContainer>
    )
  }

  return (
    <AdminPageContainer
      title="服务配置"
      description="配置可选的外部服务，未配置时使用默认行为"
      actions={
        <button onClick={handleSave} disabled={saving} className={adminBtnPrimary}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存配置
        </button>
      }
    >

      <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>服务配置保存后需要重启应用才能生效。环境变量中的配置优先级高于此处设置。</span>
      </div>

      <div key={String(ready)} className="space-y-6">

      {/* ── R2 对象存储 ── */}
      <Card className="p-6 space-y-4" style={{ borderRadius: "var(--radius-lg)" }}>
        <SectionHeader icon={HardDrive} title="Cloudflare R2 存储" desc="S3 兼容对象存储，用于游戏截图、用户头像等文件上传" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account ID" value={config.r2_account_id} onChange={v => updateService("r2_account_id", v)} placeholder="Cloudflare 账户 ID" required />
          <Field label="Bucket Name" value={config.r2_bucket_name} onChange={v => updateService("r2_bucket_name", v)} placeholder="存储桶名称" required />
          <Field label="Access Key ID" value={config.r2_access_key_id} onChange={v => updateService("r2_access_key_id", v)} placeholder="R2 API Token ID" required />
          <SecretField label="Secret Access Key" value={config.r2_secret_access_key} onChange={v => updateService("r2_secret_access_key", v)} placeholder="R2 API Token Secret" required />
          <Field label="Public URL" value={config.r2_public_url} onChange={v => updateService("r2_public_url", v)} placeholder="https://pub-xxx.r2.dev" className="sm:col-span-2" required />
        </div>
        <TestAction>
          <button onClick={() => handleTest("r2")} disabled={testing === "r2" || !config.r2_account_id} className={adminBtnSecondary}>
            {testing === "r2" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 测试中...</> : <><Zap className="h-3.5 w-3.5" /> 测试连接</>}
          </button>
          <span className="text-xs text-muted-foreground">验证 R2 凭证是否有效</span>
        </TestAction>
        <TestResultBadge result={testResult.r2} />
        <p className="text-xs text-muted-foreground">未配置时文件存储在服务器本地 uploads 目录。</p>
      </Card>

      {/* ── Redis 缓存 ── */}
      <Card className="p-6 space-y-4" style={{ borderRadius: "var(--radius-lg)" }}>
        <SectionHeader icon={Database} title="Redis 缓存" desc="Upstash Redis REST API，用于缓存加速和速率限制" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="REST URL" value={config.redis_url} onChange={v => updateService("redis_url", v)} placeholder="https://xxx.upstash.io" className="sm:col-span-2" required />
          <SecretField label="REST Token" value={config.redis_token} onChange={v => updateService("redis_token", v)} placeholder="Upstash Redis Token" className="sm:col-span-2" required />
        </div>
        <TestAction>
          <button onClick={() => handleTest("redis")} disabled={testing === "redis" || !config.redis_url} className={adminBtnSecondary}>
            {testing === "redis" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 测试中...</> : <><Zap className="h-3.5 w-3.5" /> 测试连接</>}
          </button>
          <span className="text-xs text-muted-foreground">发送 PING 验证连通性</span>
        </TestAction>
        <TestResultBadge result={testResult.redis} />
        <p className="text-xs text-muted-foreground">未配置时使用内存缓存（LRU，最多 1000 条）。</p>
      </Card>

      {/* ── 邮件服务 ── */}
      <Card className="p-6 space-y-4" style={{ borderRadius: "var(--radius-lg)" }}>
        <SectionHeader icon={Mail} title="邮件服务" desc="支持多服务商，按优先级自动切换" />

        {/* Provider 优先级 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ProviderSelect
            label="第一优先"
            value={providerOrder[0] || AVAILABLE_PROVIDERS[0]}
            onChange={v => {
              const second = providerOrder[1] || ""
              updateProviderOrder([v, second === v ? "" : second])
            }}
            excludeKey={providerOrder[1] || ""}
          />
          <ProviderSelect
            label="第二优先"
            value={providerOrder[1] || ""}
            onChange={v => {
              const first = providerOrder[0] || ""
              updateProviderOrder([first === v ? "" : first, v])
            }}
            excludeKey={providerOrder[0] || ""}
            allowNone
          />
        </div>

        {/* 动态 Provider 配置卡片 */}
        {AVAILABLE_PROVIDERS.map(providerId => {
          const fields = PROVIDER_FIELDS[providerId]
          if (!fields) return null
          const isActive = providerOrder.includes(providerId)
          const providerConfig = config.email_providers[providerId] || {}
          const currentMode = providerConfig.mode || "api"

          return (
            <div key={providerId} className={`rounded-xl border p-4 space-y-3 transition-colors ${isActive ? "border-primary/30 bg-primary/[0.02]" : "border-border bg-muted/30"}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                  {PROVIDER_LABELS[providerId]}
                </span>
                {isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">已启用</span>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields
                  .filter(field => !field.showIf || field.showIf === currentMode)
                  .map(field => {
                    // mode 字段用 Select 代替 input
                    if (field.key === "mode") {
                      return (
                        <div key={field.key}>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
                          </label>
                          <Select
                            value={providerConfig.mode || "api"}
                            onValueChange={v => {
                              if (v !== (providerConfig.mode || "api")) updateProviderField(providerId, "mode", v)
                            }}
                          >
                            <SelectTrigger className="w-full min-h-[44px] rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="api">API</SelectItem>
                              <SelectItem value="smtp">SMTP Relay</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    }
                    return (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          {field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}
                        </label>
                        {field.type === "secret" ? (
                          <SecretField
                            value={providerConfig[field.key] || ""}
                            onChange={v => updateProviderField(providerId, field.key, v)}
                            placeholder={field.placeholder}
                          />
                        ) : (
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            value={providerConfig[field.key] || ""}
                            onChange={e => updateProviderField(providerId, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            autoComplete="off"
                          />
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )
        })}

        <Field label="测试收件邮箱" value={testEmail} onChange={setTestEmail} placeholder="test@example.com" />

        <TestAction>
          <button onClick={handleTestEmail} disabled={sendingTest || !hasAnyEmailProvider || !testEmail} className={adminBtnSecondary}>
            {sendingTest ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 发送中...</> : <><Mail className="h-3.5 w-3.5" /> 发送测试邮件</>}
          </button>
          <span className="text-xs text-muted-foreground">按优先级顺序测试所有已配置的邮件服务商</span>
        </TestAction>
        <EmailTestResults result={testResult.email as (TestResult & { results?: Array<{ provider: string; label: string; ok: boolean; msg: string }> }) | undefined} />
        <p className="text-xs text-muted-foreground">未配置时将无法发送注册验证、密码重置及其它系统邮件。</p>
      </Card>

      </div>
    </AdminPageContainer>
  )
}

/* ── 子组件 ── */

function SectionHeader({ icon: Icon, title, desc }: {
  icon: React.ComponentType<{ className?: string }>
  title: string; desc: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}

function TestAction({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-3">{children}</div>
}

function TestResultBadge({ result }: { result?: TestResult }) {
  if (!result) return null
  return (
    <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${result.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
      {result.ok ? <Check className="h-4 w-4 mt-0.5 shrink-0" /> : <X className="h-4 w-4 mt-0.5 shrink-0" />}
      <span>{result.msg}</span>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, disabled, className, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
  disabled?: boolean; className?: string; required?: boolean
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled} autoComplete="off" />
    </div>
  )
}

function SecretField({ label, value, onChange, placeholder, className, required }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder: string; className?: string; required?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
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

function ProviderSelect({ label, value, onChange, excludeKey, allowNone }: {
  label: string; value: string; onChange: (v: string) => void; excludeKey?: string; allowNone?: boolean
}) {
  const options = [
    { key: "__none__", label: "无" },
    ...AVAILABLE_PROVIDERS.map(id => ({ key: id, label: PROVIDER_LABELS[id] })),
  ].filter(o => {
    if (!allowNone && o.key === "__none__") return false
    if (excludeKey && o.key === excludeKey) return false
    return true
  })

  const handleChange = (v: string) => {
    const next = v === "__none__" ? "" : v
    if (next !== value) onChange(next)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
      <Select value={value || "__none__"} onValueChange={handleChange}>
        <SelectTrigger className="w-full min-h-[44px] rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function EmailTestResults({ result }: {
  result?: TestResult & { results?: Array<{ provider: string; label: string; ok: boolean; msg: string }> }
}) {
  if (!result) return null
  return (
    <div className="space-y-2">
      {result.results ? (
        result.results.map(r => (
          <div key={r.provider} className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${r.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
            {r.ok ? <Check className="h-4 w-4 mt-0.5 shrink-0" /> : <X className="h-4 w-4 mt-0.5 shrink-0" />}
            <div>
              <span className="font-medium">{r.label}</span>
              <span className="mx-1">—</span>
              <span>{r.msg}</span>
            </div>
          </div>
        ))
      ) : (
        <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${result.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
          {result.ok ? <Check className="h-4 w-4 mt-0.5 shrink-0" /> : <X className="h-4 w-4 mt-0.5 shrink-0" />}
          <span>{result.msg}</span>
        </div>
      )}
    </div>
  )
}
