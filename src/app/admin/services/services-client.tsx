"use client"

import { AdminPageContainer } from "@/components/admin-page-container"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PROVIDER_FIELDS, PROVIDER_LABELS } from "@/lib/email-providers-meta"
import { cn } from "@/lib/utils"
import { adminBtnPrimary, adminBtnSecondary, adminInput } from "@/lib/admin-styles"
import { AlertTriangle, Check, Database, Eye, EyeOff, HardDrive, Loader2, Mail, Save, X, Zap } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"

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
  // 只写字段的「是否已配置」标记（后端只给布尔，值本身永不回传）
  r2_access_key_id_configured: boolean
  r2_secret_access_key_configured: boolean
  redis_token_configured: boolean
}

const EMPTY: ServiceConfig = {
  r2_account_id: "", r2_access_key_id: "", r2_secret_access_key: "",
  r2_bucket_name: "", r2_public_url: "",
  redis_url: "", redis_token: "",
  email_providers: {},
  email_provider_order: "",
  r2_access_key_id_configured: false,
  r2_secret_access_key_configured: false,
  redis_token_configured: false,
}

/**
 * 各 provider 的敏感字段（与后端 SECRET_FIELDS 对应）。
 * GET 时这些字段会被掩码，原样提交回去等于「把星号串写成真密钥」。
 */
const SECRET_FIELD_KEYS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(PROVIDER_FIELDS).map(([id, fields]) => [
    id,
    new Set(fields.filter(f => f.type === "secret").map(f => f.key)),
  ]),
)

interface TestResult { ok: boolean; msg: string }
interface EmailTestResults { success?: boolean; message?: string; error?: string; results?: Array<{ provider: string; label: string; ok: boolean; msg: string }> }

export function ServicesClient() {
  const [config, setConfig] = useState<ServiceConfig>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, TestResult>>({})
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)
  // 初次加载的 email_providers 快照（字符串），仅用于提交前比对「哪些字段根本没改」。
  // 放 ref 不放 state：不参与渲染，避免多余 re-render。
  const initialProvidersRef = useRef<string>("{}")

  useEffect(() => {
    apiFetchSafe<{ data: ServiceConfig }>("/api/admin/services")
      .then(({ ok, data }) => {
        if (ok && data?.data) {
          const d = data.data
          const providers = (typeof d.email_providers === "object" && d.email_providers !== null) ? d.email_providers : {}
          initialProvidersRef.current = JSON.stringify(providers)
          setConfig(prev => ({
            ...prev,
            r2_account_id: String(d.r2_account_id ?? ""),
            r2_access_key_id: String(d.r2_access_key_id ?? ""),
            r2_secret_access_key: String(d.r2_secret_access_key ?? ""),
            r2_bucket_name: String(d.r2_bucket_name ?? ""),
            r2_public_url: String(d.r2_public_url ?? ""),
            redis_url: String(d.redis_url ?? ""),
            redis_token: String(d.redis_token ?? ""),
            email_providers: providers,
            email_provider_order: String(d.email_provider_order ?? ""),
            r2_access_key_id_configured: !!d.r2_access_key_id_configured,
            r2_secret_access_key_configured: !!d.r2_secret_access_key_configured,
            redis_token_configured: !!d.redis_token_configured,
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
      let snapshot: Record<string, Record<string, string>> = {}
      try { snapshot = JSON.parse(initialProvidersRef.current || "{}") } catch { snapshot = {} }

      const emailProviders: Record<string, Record<string, string>> = {}
      for (const [providerId, fields] of Object.entries(config.email_providers)) {
        if (!fields || typeof fields !== "object") continue
        const before = snapshot[providerId] ?? {}
        const secretKeys = SECRET_FIELD_KEYS[providerId] ?? new Set<string>()
        const next: Record<string, string> = { ...fields }
        // 与快照逐字段比对：值完全没变的敏感字段不提交（通常是 GET 回传的掩码）
        for (const [k, v] of Object.entries(fields)) {
          if (secretKeys.has(k) && v === before[k]) delete next[k]
        }
        // 剔除后变空则整个 provider 都不提交：否则后端会当成「显式清空」把凭据删掉
        if (Object.keys(next).length === 0) continue
        emailProviders[providerId] = next
      }

      const { ok, data, error } = await apiFetchSafe<{ data?: { success?: boolean; message?: string } }>("/api/admin/services", {
        method: "POST",
        body: {
          ...config,
          email_providers: emailProviders,
          email_provider_order: config.email_provider_order,
        },
      })
      if (!ok || data?.data?.success === false) throw new Error(data?.data?.message || error)
      // reloadServiceConfig() 只更新 service-config 的内存配置：邮件与 Redis 每次调用都重新读，
      // R2 的 S3Client 在 getStorage() 里是单例、构造一次后不再变，改 R2 必须重启进程。
      // 热重载失败时后端会带 message，优先显示它
      toast.success(data?.data?.message || "配置已保存；邮件与 Redis 立即生效，R2 需重启应用后生效")
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
        ? { account_id: config.r2_account_id, access_key_id: config.r2_access_key_id, secret_access_key: config.r2_secret_access_key, bucket_name: config.r2_bucket_name }
        : { url: config.redis_url, token: config.redis_token }
      const { data } = await apiFetchSafe<EmailTestResults>("/api/admin/services", {
        method: "POST",
        body: { action: "test", service, config: payload },
      })
      const result: EmailTestResults = { ...(data ?? {}) }
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
      const { data } = await apiFetchSafe<EmailTestResults>("/api/admin/services", {
        method: "POST",
        body: {
          action: "test", service: "email",
          config: {
            to: testEmail.trim(),
            email_providers: JSON.stringify(config.email_providers),
            email_provider_order: config.email_provider_order,
          },
        },
      })
      const result: EmailTestResults = { ...(data ?? {}) }
      setTestResult(prev => ({
        ...prev,
        email: {
          ok: !!result?.success,
          msg: result?.message || result?.error || "未知结果",
          results: result?.results,
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
      <AdminPageContainer title="服务配置" eyebrow="SERVICES">
        {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />)}
      </AdminPageContainer>
    )
  }

  return (
    <AdminPageContainer
      title="服务配置"
      eyebrow="SERVICES"
      description="配置可选的外部服务，未配置时使用默认行为"
      actions={
        <button onClick={handleSave} disabled={saving} className={cn(adminBtnPrimary, "h-10")}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存配置
        </button>
      }
    >

      <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>邮件与 Redis 保存后立即生效，R2 需重启应用后生效。环境变量中的配置优先级高于此处设置。</span>
      </div>

      <div key={String(ready)} className="space-y-6">

      {/* ── R2 对象存储 ── */}
      <Card radius="xl" className="p-6 space-y-4">
        <SectionHeader icon={HardDrive} title="Cloudflare R2 存储" desc="S3 兼容对象存储，用于游戏截图、用户头像等文件上传" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account ID" value={config.r2_account_id} onChange={v => updateService("r2_account_id", v)} placeholder="Cloudflare 账户 ID" required />
          <Field label="Bucket Name" value={config.r2_bucket_name} onChange={v => updateService("r2_bucket_name", v)} placeholder="存储桶名称" required />
          <Field label="Access Key ID" value={config.r2_access_key_id} onChange={v => updateService("r2_access_key_id", v)} placeholder="留空表示保持原值不变" required configured={config.r2_access_key_id_configured} />
          <SecretField label="Secret Access Key" value={config.r2_secret_access_key} onChange={v => updateService("r2_secret_access_key", v)} placeholder="留空表示保持原值不变" required configured={config.r2_secret_access_key_configured} />
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
      <Card radius="xl" className="p-6 space-y-4">
        <SectionHeader icon={Database} title="Redis 缓存" desc="Upstash Redis REST API，用于缓存加速和速率限制" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="REST URL" value={config.redis_url} onChange={v => updateService("redis_url", v)} placeholder="https://xxx.upstash.io" className="sm:col-span-2" required />
          <SecretField label="REST Token" value={config.redis_token} onChange={v => updateService("redis_token", v)} placeholder="留空表示保持原值不变" className="sm:col-span-2" required configured={config.redis_token_configured} />
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
      <Card radius="xl" className="p-6 space-y-4">
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
                {isActive && <span className="text-micro px-1.5 py-0.5 rounded bg-primary/10 text-primary">已启用</span>}
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
                            <SelectTrigger className="w-full h-12 text-[15px] leading-6 rounded-xl">
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
                            className={cn(adminInput)}
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
      <div className="p-2 rounded-lg bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></div>
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

function Field({ label, value, onChange, placeholder, disabled, className, required, configured }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
  disabled?: boolean; className?: string; required?: boolean; configured?: boolean
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
        {configured && <span className="ml-1.5 text-xs font-normal text-muted-foreground">已配置 · 留空表示不修改</span>}
      </label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        disabled={disabled} autoComplete="off" className={cn(adminInput)} />
    </div>
  )
}

function SecretField({ label, value, onChange, placeholder, className, required, configured }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder: string; className?: string; required?: boolean; configured?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
          {configured && <span className="ml-1.5 text-xs font-normal text-muted-foreground">已配置 · 留空表示不修改</span>}
        </label>
      )}
      <div className="relative">
        <Input type={visible ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className={cn(adminInput, "pr-10")} autoComplete="new-password" />
        <button type="button" onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
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
        <SelectTrigger className="w-full h-12 text-[15px] leading-6 rounded-xl">
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
