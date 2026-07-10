"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { applyThemeColor } from "@/lib/theme-colors"
import { THEME_PRESETS } from "@/lib/theme-presets"
import { cn } from "@/lib/utils"

/* ── 复用常量 ── */

const TAG_PRESET_COLORS = [
  "#7c8a9e", "#6b7280", "#9ca3af",
  "#a78bfa", "#818cf8", "#60a5fa", "#38bdf8", "#22d3ee",
  "#34d399", "#4ade80", "#facc15", "#fb923c", "#f87171",
  "#e879f9", "#f472b6",
]

const PRESET_TAG_GROUPS = [
  { id: "preset_home_card", name: "首页卡片标签", color: "#60a5fa", desc: "游戏卡片下方展示" },
  { id: "preset_detail_header", name: "详情页标签", color: "#f472b6", desc: "游戏详情页信息栏" },
  { id: "preset_discover", name: "发现页标签", color: "#a78bfa", desc: "搜索筛选、标签云" },
  { id: "preset_resource_tab", name: "资源标签", color: "#22c55e", desc: "资源 tab 分类" },
]

/* ── 类型 ── */
interface FormData {
  siteName: string
  siteDescription: string
  siteLogo: string
  placeholderImage: string
  registrationEnabled: boolean
  themeColor: string
  tagGroupColors: Record<string, string>
  username: string
  email: string
  password: string
  confirmPassword: string
}

const INITIAL: FormData = {
  siteName: "同人游戏站",
  siteDescription: "",
  siteLogo: "",
  placeholderImage: "",
  registrationEnabled: true,
  themeColor: "#E0A87C",
  tagGroupColors: Object.fromEntries(PRESET_TAG_GROUPS.map(g => [g.id, g.color])),
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
}

const STEPS = [
  { label: "站点信息", icon: "⚙️" },
  { label: "个性化", icon: "🎨" },
  { label: "站长账号", icon: "👤" },
  { label: "完成", icon: "✨" },
]

function friendlyError(msg: string): string {
  if (msg.includes("already_initialized") || msg.includes("已完成初始化")) return "站点已初始化，请勿重复操作"
  if (msg.includes("unique") || msg.includes("duplicate")) return "数据冲突，请检查输入是否重复"
  if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) return "网络超时，请检查网络后重试"
  if (msg.includes("fetch")) return "网络连接失败，请检查网络"
  return msg
}

function getPasswordStrength(pw: string) {
  if (!pw) return { level: 0, label: "", color: "" }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { level: 1, label: "弱", color: "bg-red-400" }
  if (s <= 2) return { level: 2, label: "一般", color: "bg-amber-400" }
  if (s <= 3) return { level: 3, label: "良好", color: "bg-emerald-400" }
  return { level: 4, label: "强", color: "bg-emerald-500" }
}

const SUBMIT_STAGES = ["正在创建站点...", "正在保存配置...", "正在创建站长账号...", "正在完成初始化..."]

const inputBase = cn(
  "w-full h-11 rounded-lg px-4 text-sm transition-all duration-200 outline-none",
  "bg-white/[0.06] border border-white/[0.08] text-white/90 placeholder:text-white/25",
  "focus:border-[var(--theme-color)]/50 focus:bg-white/[0.08]",
  "focus:shadow-[0_0_0_3px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.1)]",
  "dark:bg-white/[0.06] dark:border-white/[0.08] dark:text-white/90 dark:placeholder:text-white/25",
  "light:bg-neutral-50 light:border-neutral-200 light:text-neutral-900 light:placeholder:text-neutral-400",
  "light:focus:border-[var(--theme-color)] light:focus:bg-white",
  "disabled:opacity-40 disabled:cursor-not-allowed",
)

/* ═══════════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════════ */
export function SetupWizard() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const origClassesRef = useRef("")

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [logoPreview, setLogoPreview] = useState("")
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitStage, setSubmitStage] = useState(0)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"dark" | "light">("dark")
  const [showPw, setShowPw] = useState(false)
  const [showPw2, setShowPw2] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [editingTagGroup, setEditingTagGroup] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const isDark = mode === "dark"
  const pwStrength = getPasswordStrength(form.password)

  useEffect(() => {
    origClassesRef.current = document.documentElement.className
    applyThemeColor(form.themeColor)
    return () => { document.documentElement.className = origClassesRef.current }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleMode = useCallback(() => {
    setMode(prev => {
      const next = prev === "dark" ? "light" : "dark"
      document.documentElement.classList.toggle("light", next === "light")
      document.documentElement.classList.toggle("dark", next !== "light")
      applyThemeColor(form.themeColor)
      return next
    })
  }, [form.themeColor])

  const update = (key: keyof FormData, value: string | boolean | Record<string, string>) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError("")
  }

  function selectThemeColor(color: string) {
    update("themeColor", color)
    applyThemeColor(color)
  }

  function updateTagGroupColor(groupId: string, color: string) {
    setForm(prev => ({
      ...prev,
      tagGroupColors: { ...prev.tagGroupColors, [groupId]: color },
    }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/setup/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "上传失败")
      update("siteLogo", data.data.url)
      setLogoPreview(URL.createObjectURL(file))
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : "上传失败"))
    } finally {
      setUploading(false)
    }
  }

  function validateStep(): boolean {
    setError("")
    if (step === 0) {
      if (!form.siteName.trim()) { setError("站点名称不能为空"); return false }
      if (form.siteName.trim().length > 50) { setError("站点名称不超过 50 个字符"); return false }
      return true
    }
    if (step === 2) {
      if (!form.username.trim()) { setError("站长用户名不能为空"); return false }
      if (form.username.trim().length < 2) { setError("用户名至少 2 个字符"); return false }
      if (form.username.trim().length > 20) { setError("用户名不超过 20 个字符"); return false }
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("邮箱格式不正确"); return false }
      if (form.password.length < 8) { setError("密码至少 8 个字符"); return false }
      if (form.password !== form.confirmPassword) { setError("两次密码不一致"); return false }
      return true
    }
    return true
  }

  function nextStep() { if (validateStep()) setStep(s => s + 1) }

  function skipStep() {
    if (step === 1) {
      // 跳过个性化：重置为主题和标签默认值
      selectThemeColor(INITIAL.themeColor)
      update("tagGroupColors", INITIAL.tagGroupColors)
    }
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    if (loading) return
    setLoading(true)
    setError("")
    setSubmitStage(0)
    const stageTimer = setInterval(() => setSubmitStage(p => Math.min(p + 1, SUBMIT_STAGES.length - 1)), 800)
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: form.siteName.trim(),
          siteDescription: form.siteDescription.trim(),
          siteLogo: form.siteLogo,
          placeholderImage: form.placeholderImage.trim(),
          registrationEnabled: form.registrationEnabled,
          themeColor: form.themeColor,
          tagGroupColors: form.tagGroupColors,
          admin: { username: form.username.trim(), email: form.email.trim(), password: form.password },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "初始化失败")
      setSubmitStage(2)

      const themeSettings = { themeColor: form.themeColor, themeRadius: 12, themeShadowIntensity: 50, themeAlpha: 15 }
      localStorage.setItem("site-theme-settings", JSON.stringify(themeSettings))
      localStorage.setItem("site-theme-color", form.themeColor)

      setSubmitStage(3)
      const signInResult = await signIn("credentials", { redirect: false, username: form.username.trim(), password: form.password })
      if (signInResult?.ok) {
        router.refresh()
        setCompleted(true)
      } else {
        router.push("/login")
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : "初始化失败，请重试"))
    } finally {
      clearInterval(stageTimer)
      setLoading(false)
      setSubmitStage(0)
    }
  }

  /* ── 欢迎页 ── */
  if (completed) {
    const themeLabel = THEME_PRESETS.find(p => p.color === form.themeColor)?.label || "自定义"
    return (
      <div className={cn("fixed inset-0 flex items-start lg:items-center justify-center p-4 overflow-auto transition-colors duration-500", isDark ? "bg-[#0a0a0f]" : "bg-[#f8f7f4]")}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.08] bg-[var(--theme-color)]")} />
        </div>
        <div className={cn("relative z-10 w-full max-w-md rounded-2xl overflow-hidden text-center", isDark ? "bg-white/[0.03] border border-white/[0.06] shadow-[0_8px_60px_rgba(0,0,0,0.5)]" : "bg-white border border-neutral-200 shadow-[0_8px_40px_rgba(0,0,0,0.08)]")} style={{ animation: "wiz-fade-in 0.6s ease-out" }}>
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-color)]/30 to-transparent" />
          <div className="p-8 sm:p-10 space-y-6">
            <div className="text-5xl" style={{ animation: "wiz-fade-in 0.8s ease-out" }}>🎉</div>
            <div>
              <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-neutral-900")}>站点初始化完成</h1>
              <p className={cn("text-sm mt-2", isDark ? "text-white/40" : "text-neutral-400")}>{form.siteName} 已准备就绪</p>
            </div>
            <div className={cn("rounded-xl overflow-hidden divide-y text-left", isDark ? "bg-white/[0.03] border border-white/[0.06] divide-white/[0.05]" : "bg-neutral-50 border border-neutral-200 divide-neutral-200")}>
              <SummaryRow label="站点" value={form.siteName} isDark={isDark} />
              <SummaryRow label="主题" isDark={isDark}>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: form.themeColor }} />
                  <span className={cn("text-sm font-medium", isDark ? "text-white/75" : "text-neutral-700")}>{themeLabel}</span>
                </span>
              </SummaryRow>
              <SummaryRow label="站长" value={form.username} isDark={isDark} />
            </div>
            <p className={cn("text-xs", isDark ? "text-white/25" : "text-neutral-400")}>接下来你可以配置存储、上传游戏内容、自定义站点页面</p>
            <div className="flex gap-3">
              <button type="button" className={cn("flex-1 h-11 rounded-xl text-sm font-medium transition-all active:scale-[0.98]", isDark ? "bg-white/[0.06] border border-white/[0.08] text-white/70 hover:bg-white/[0.1]" : "bg-neutral-100 border border-neutral-200 text-neutral-600 hover:bg-neutral-200")} onClick={() => router.push("/")}>查看网站</button>
              <button type="button" className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] text-[var(--theme-fg)] shadow-[0_4px_20px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.2)]" style={{ backgroundColor: "var(--theme-color)" }} onClick={() => router.push("/admin")}>进入后台 →</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════
     主表单
     ═══════════════════════════════════════════════════ */
  const canSkip = step === 1

  return (
    <>
      <style>{`
        @keyframes wiz-fade-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes wiz-glow { 0%,100% { box-shadow:0 0 8px rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.3); } 50% { box-shadow:0 0 18px rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.5); } }
        .wiz-card input:-webkit-autofill,
        .wiz-card input:-webkit-autofill:hover,
        .wiz-card input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px ${isDark ? "#1a1a24" : "#f5f5f5"} inset !important;
          -webkit-text-fill-color: ${isDark ? "rgba(255,255,255,0.9)" : "#1a1a1e"} !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div className={cn("fixed inset-0 flex items-start lg:items-center justify-center p-3 sm:p-4 overflow-auto transition-colors duration-500", isDark ? "bg-[#0a0a0f]" : "bg-[#f8f7f4]")}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={cn("absolute -top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.06]", isDark ? "bg-amber-400" : "bg-amber-300")} />
          <div className={cn("absolute -bottom-1/4 -right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.04]", isDark ? "bg-purple-400" : "bg-orange-200")} />
        </div>

        <div className={cn("wiz-card relative z-10 w-full max-w-5xl rounded-2xl overflow-hidden", isDark ? "bg-white/[0.03] border border-white/[0.06] shadow-[0_8px_60px_rgba(0,0,0,0.5)]" : "bg-white border border-neutral-200 shadow-[0_8px_40px_rgba(0,0,0,0.08)]")} style={{ animation: "wiz-fade-in 0.5s ease-out" }}>
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-color)]/20 to-transparent" />

          {/* 明暗切换 */}
          <button type="button" onClick={toggleMode} className={cn("absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all", isDark ? "bg-white/[0.06] text-white/50 hover:bg-white/[0.1]" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200")} title={isDark ? "切换到浅色预览" : "切换到深色预览"}>
            {isDark ? "☀️" : "🌙"}
          </button>

          <div className="p-4 sm:p-6 lg:p-8">

            {/* 标题 */}
            <div className="text-center mb-5 sm:mb-6">
              <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs mb-3", isDark ? "bg-[var(--theme-color)]/10 text-[var(--theme-color)] border border-[var(--theme-color)]/20" : "bg-[var(--theme-color)]/8 text-[var(--theme-color)] border border-[var(--theme-color)]/15")}>
                站点初始化向导
              </div>
              <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-neutral-900")}>欢迎使用 Fangame</h1>
              <p className={cn("text-xs sm:text-sm mt-1", isDark ? "text-white/35" : "text-neutral-400")}>配置你的站点，所有设置后续可在后台随时修改</p>
            </div>

            {/* 步骤进度条 */}
            <div className="flex items-center justify-center gap-0 px-2 sm:px-4 mb-8 sm:mb-10">
              {STEPS.map((s, i) => {
                const done = i < step
                const active = i === step
                return (
                  <div key={s.label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center relative">
                      <div className={cn("relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-500 shrink-0", done && "bg-[var(--theme-color)] text-[var(--theme-fg)]", active && "border-2 border-[var(--theme-color)]/60 text-[var(--theme-color)]", !done && !active && (isDark ? "bg-white/[0.05] text-white/25 border border-white/[0.08]" : "bg-neutral-100 text-neutral-300 border border-neutral-200"))} style={active ? { animation: "wiz-glow 2.5s ease-in-out infinite" } : undefined}>
                        {done ? "✓" : s.icon}
                      </div>
                      <span className={cn("absolute -bottom-5 text-[9px] sm:text-xs whitespace-nowrap transition-colors", active ? "text-[var(--theme-color)] font-medium" : done ? (isDark ? "text-white/45" : "text-neutral-500") : (isDark ? "text-white/20" : "text-neutral-300"))}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={cn("flex-1 mx-1 sm:mx-3 h-0.5 rounded-full overflow-hidden relative", isDark ? "bg-white/[0.06]" : "bg-neutral-200")}>
                        <div className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out", done ? "w-full bg-[var(--theme-color)]" : "w-0")} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="h-2" />

            {/* 错误提示 */}
            {error && (
              <div className={cn("flex items-center gap-2 text-sm rounded-lg px-4 py-3 mb-4", isDark ? "text-red-300 bg-red-500/[0.08] border border-red-500/20" : "text-red-600 bg-red-50 border border-red-200")} style={{ animation: "wiz-fade-in 0.3s ease-out" }}>
                <span>⚠</span> {error}
              </div>
            )}

            {/* 内容区 */}
            <div className="flex flex-col lg:flex-row gap-6">

              {/* 左侧：表单 */}
              <div className="flex-1 min-w-0">

                {/* ─── Step 1: 站点信息 ─── */}
                {step === 0 && (
                  <div className="space-y-4 sm:space-y-5" style={{ animation: "wiz-fade-in 0.4s ease-out" }}>
                    <Field label="站点名称" required isDark={isDark} hint="显示在网站标题、Header、Footer 和 SEO 中">
                      <input className={inputBase} value={form.siteName} onChange={e => update("siteName", e.target.value)} placeholder="同人游戏站" maxLength={50} />
                    </Field>
                    <Field label="站点描述" isDark={isDark} hint="用于 SEO description 和网站首页介绍">
                      <input className={inputBase} value={form.siteDescription} onChange={e => update("siteDescription", e.target.value)} placeholder="面向 Galgame/视觉小说爱好者的社区平台" />
                    </Field>
                    <Field label="站点 Logo" isDark={isDark} hint="建议 120×120 透明底 PNG，最大 2MB">
                      <div className="flex items-center gap-3 flex-wrap">
                        {logoPreview || form.siteLogo ? (
                          <img src={logoPreview || form.siteLogo} alt="Logo" className="h-11 w-11 rounded-lg object-contain bg-white/10 border border-white/10" />
                        ) : (
                          <div className={cn("h-11 w-11 rounded-lg flex items-center justify-center text-lg border border-dashed", isDark ? "bg-white/[0.04] border-white/[0.1] text-white/20" : "bg-neutral-50 border-neutral-200 text-neutral-300")}>🎮</div>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        <button type="button" disabled={uploading} className={cn("h-9 px-4 rounded-lg text-xs font-medium transition-all active:scale-95", isDark ? "bg-white/[0.06] border border-white/[0.1] text-white/70 hover:bg-white/[0.1]" : "bg-neutral-100 border border-neutral-200 text-neutral-600 hover:bg-neutral-200", "disabled:opacity-40")} onClick={() => fileRef.current?.click()}>
                          {uploading ? "上传中..." : "选择图片"}
                        </button>
                        {form.siteLogo && <button type="button" className={cn("text-xs", isDark ? "text-white/30 hover:text-red-400" : "text-neutral-400 hover:text-red-500")} onClick={() => { update("siteLogo", ""); setLogoPreview("") }}>移除</button>}
                      </div>
                    </Field>
                    <Field label="注册策略" isDark={isDark}>
                      <select value={form.registrationEnabled ? "1" : "0"} onChange={e => update("registrationEnabled", e.target.value === "1")} className={cn(inputBase, "appearance-none cursor-pointer", "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23ffffff60%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')]", "bg-no-repeat bg-[position:right_14px_center]", "[&>option]:bg-[#1a1a24] [&>option]:text-white/80")}>
                        <option value="1">开放注册 — 允许新用户注册</option>
                        <option value="0">关闭注册 — 仅管理员可创建用户</option>
                      </select>
                    </Field>
                  </div>
                )}

                {/* ─── Step 2: 个性化（主题色 + 标签色） ─── */}
                {step === 1 && (
                  <div className="space-y-6" style={{ animation: "wiz-fade-in 0.4s ease-out" }}>
                    {/* 主题色 */}
                    <div>
                      <Field label="主题色" isDark={isDark} hint="影响按钮、链接、高亮等全局配色">
                        <div className="grid grid-cols-5 sm:grid-cols-5 gap-1.5 sm:gap-2">
                          {THEME_PRESETS.map(p => {
                            const selected = form.themeColor === p.color
                            return (
                              <button key={p.name} type="button" onClick={() => selectThemeColor(p.color)} className={cn("group relative flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-xl transition-all", selected ? "bg-[var(--theme-color)]/10 ring-2 ring-[var(--theme-color)]/40 scale-[1.02]" : (isDark ? "hover:bg-white/[0.04]" : "hover:bg-neutral-50"))} title={`${p.label} — ${p.desc}`}>
                                <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all", selected && "ring-2 ring-white/30 scale-110")} style={{ backgroundColor: p.color }}>
                                  {selected && <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow">✓</span>}
                                </div>
                                <span className={cn("text-[9px] sm:text-[10px] leading-tight text-center", selected ? "text-[var(--theme-color)] font-medium" : (isDark ? "text-white/35" : "text-neutral-500"))}>{p.label}</span>
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <input type="color" value={form.themeColor} onChange={e => selectThemeColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                          <span className={cn("text-xs", isDark ? "text-white/30" : "text-neutral-400")}>自定义颜色</span>
                        </div>
                      </Field>
                    </div>

                    {/* 标签颜色 */}
                    <div className={cn("border-t pt-5", isDark ? "border-white/[0.06]" : "border-neutral-200")}>
                      <Field label="标签分类颜色" isDark={isDark} hint="每种标签分类可独立设置颜色，用于区分不同类型标签">
                        <div className="space-y-2">
                          {PRESET_TAG_GROUPS.map(g => {
                            const color = form.tagGroupColors[g.id] || g.color
                            const editing = editingTagGroup === g.id
                            return (
                              <div key={g.id}>
                                <div className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all", isDark ? "bg-white/[0.03] hover:bg-white/[0.05]" : "bg-neutral-50 hover:bg-neutral-100")}>
                                  <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-sm font-medium", isDark ? "text-white/80" : "text-neutral-700")}>{g.name}</p>
                                    <p className={cn("text-[11px]", isDark ? "text-white/25" : "text-neutral-400")}>{g.desc}</p>
                                  </div>
                                  <button type="button" className={cn("text-xs px-2.5 py-1 rounded-md transition-all", isDark ? "bg-white/[0.06] text-white/50 hover:bg-white/[0.1]" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200")} onClick={() => setEditingTagGroup(editing ? null : g.id)}>
                                    {editing ? "收起" : "调整"}
                                  </button>
                                </div>
                                {editing && (
                                  <div className={cn("flex flex-wrap gap-1.5 px-3 py-2.5", isDark ? "bg-white/[0.02]" : "bg-neutral-50/50")} style={{ animation: "wiz-fade-in 0.2s ease-out" }}>
                                    {TAG_PRESET_COLORS.map(c => (
                                      <button key={c} type="button" onClick={() => updateTagGroupColor(g.id, c)} className={cn("w-6 h-6 rounded-full transition-all border-2", color === c ? "border-white/50 scale-110" : "border-transparent hover:scale-105")} style={{ backgroundColor: c }} />
                                    ))}
                                    <input type="color" value={color} onChange={e => updateTagGroupColor(g.id, e.target.value)} className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent" />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </Field>
                    </div>
                  </div>
                )}

                {/* ─── Step 3: 站长账号 ─── */}
                {step === 2 && (
                  <div className="space-y-4 sm:space-y-5" style={{ animation: "wiz-fade-in 0.4s ease-out" }}>
                    <div className={cn("flex items-start gap-3 rounded-xl px-4 py-3 text-sm", isDark ? "bg-[var(--theme-color)]/5 border border-[var(--theme-color)]/10" : "bg-amber-50 border border-amber-100")}>
                      <span className="text-lg mt-0.5">👑</span>
                      <div>
                        <p className={cn("font-medium", isDark ? "text-[var(--theme-color)]" : "text-amber-800")}>创建站长账号（Owner）</p>
                        <p className={cn("text-xs mt-0.5", isDark ? "text-white/40" : "text-amber-600/70")}>站长拥有最高权限，负责管理整个站点。此账号唯一，后续可在后台修改信息。</p>
                      </div>
                    </div>
                    <Field label="用户名" required isDark={isDark} hint="登录后台使用的账号名，2-20 个字符">
                      <input className={inputBase} value={form.username} onChange={e => update("username", e.target.value)} placeholder="admin" maxLength={20} />
                    </Field>
                    <Field label="邮箱" isDark={isDark} hint="可选。用于密码重置，暂时不填可以之后在后台补充">
                      <input className={inputBase} type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="admin@example.com（可选）" />
                    </Field>
                    <Field label="密码" required isDark={isDark}>
                      <div className="relative">
                        <input className={cn(inputBase, "pr-10")} type={showPw ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)} placeholder="至少 8 个字符" />
                        <button type="button" className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-sm", isDark ? "text-white/25 hover:text-white/50" : "text-neutral-300 hover:text-neutral-500")} onClick={() => setShowPw(v => !v)} tabIndex={-1}>{showPw ? "🙈" : "👁️"}</button>
                      </div>
                      {form.password.length > 0 && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 flex gap-1">{[1, 2, 3, 4].map(i => <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", i <= pwStrength.level ? pwStrength.color : (isDark ? "bg-white/[0.06]" : "bg-neutral-200"))} />)}</div>
                          <span className={cn("text-[11px] tabular-nums", pwStrength.level <= 1 ? "text-red-400" : pwStrength.level <= 2 ? "text-amber-400" : "text-emerald-400")}>{pwStrength.label}</span>
                        </div>
                      )}
                    </Field>
                    <Field label="确认密码" required isDark={isDark}>
                      <div className="relative">
                        <input className={cn(inputBase, "pr-10")} type={showPw2 ? "text" : "password"} value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)} placeholder="再次输入密码" />
                        <button type="button" className={cn("absolute right-3 top-1/2 -translate-y-1/2 text-sm", isDark ? "text-white/25 hover:text-white/50" : "text-neutral-300 hover:text-neutral-500")} onClick={() => setShowPw2(v => !v)} tabIndex={-1}>{showPw2 ? "🙈" : "👁️"}</button>
                      </div>
                      {form.confirmPassword && form.password !== form.confirmPassword && <p className="text-[11px] text-red-400 mt-1">两次密码不一致</p>}
                    </Field>
                    <div className={cn("flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs", isDark ? "text-white/25 bg-white/[0.02] border border-white/[0.04]" : "text-neutral-400 bg-neutral-50 border border-neutral-100")}>
                      <span className="mt-px shrink-0">🔐</span>
                      <span>该账号拥有管理网站的最高权限，请妥善保存密码。初始化完成后可在后台修改账号信息。</span>
                    </div>
                  </div>
                )}

                {/* ─── Step 4: 确认初始化 ─── */}
                {step === 3 && (
                  <div className="space-y-4" style={{ animation: "wiz-fade-in 0.4s ease-out" }}>
                    <p className={cn("text-sm", isDark ? "text-white/40" : "text-neutral-400")}>请确认以下站点配置：</p>
                    <div className={cn("rounded-xl overflow-hidden divide-y", isDark ? "bg-white/[0.03] border border-white/[0.06] divide-white/[0.05]" : "bg-neutral-50 border border-neutral-200 divide-neutral-200")}>
                      <SummaryRow label="站点名称" value={form.siteName} isDark={isDark} />
                      {form.siteDescription && <SummaryRow label="站点描述" value={form.siteDescription} isDark={isDark} />}
                      <SummaryRow label="Logo" isDark={isDark}>
                        {form.siteLogo ? <span className="flex items-center gap-2"><img src={logoPreview || form.siteLogo} alt="" className="w-6 h-6 rounded object-contain" /><span className={cn("text-sm", isDark ? "text-white/60" : "text-neutral-500")}>已上传</span></span> : <span className={cn("text-sm", isDark ? "text-white/30" : "text-neutral-400")}>使用默认</span>}
                      </SummaryRow>
                      <SummaryRow label="主题色" isDark={isDark}>
                        <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full" style={{ backgroundColor: form.themeColor }} /><span className={cn("text-sm font-medium", isDark ? "text-white/70" : "text-neutral-700")}>{THEME_PRESETS.find(p => p.color === form.themeColor)?.label || form.themeColor}</span></span>
                      </SummaryRow>
                      <SummaryRow label="注册策略" value={form.registrationEnabled ? "开放注册" : "关闭注册"} isDark={isDark} />
                      <SummaryRow label="站长账号" value={form.username} isDark={isDark} accent />
                      {form.email && <SummaryRow label="邮箱" value={form.email} isDark={isDark} />}
                    </div>
                    <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs", isDark ? "text-white/30 bg-white/[0.02]" : "text-neutral-400 bg-neutral-50")}>
                      <span className="mt-px">💡</span>
                      <span>初始化完成后，所有配置都可以在后台「站点设置」中随时修改。</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 右侧：实时预览（桌面内联 / 移动端浮层） ── */}
              <div className="lg:w-[300px] shrink-0">
                {/* 桌面端：内联显示 */}
                <div className="hidden lg:block">
                  <PreviewPanel form={form} logoPreview={logoPreview} step={step} isDark={isDark} />
                </div>
                {/* 移动端：折叠按钮 */}
                <button type="button"
                  className={cn(
                    "lg:hidden w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-medium transition-all mt-2",
                    isDark
                      ? "bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.07]"
                      : "bg-neutral-50 border border-neutral-200 text-neutral-500 hover:bg-neutral-100",
                    showPreview && (isDark ? "bg-white/[0.07] text-white/70" : "bg-neutral-100 text-neutral-600"),
                  )}
                  onClick={() => setShowPreview(v => !v)}
                >
                  <span>{showPreview ? "隐藏预览" : "查看实时预览"}</span>
                  <span className={cn("transition-transform duration-200", showPreview && "rotate-180")}>▾</span>
                </button>
                {/* 移动端：折叠面板 */}
                {showPreview && (
                  <div className="lg:hidden mt-3" style={{ animation: "wiz-fade-in 0.25s ease-out" }}>
                    <PreviewPanel form={form} logoPreview={logoPreview} step={step} isDark={isDark} />
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6">
              {step > 0 && !loading && (
                <button type="button" className={cn("h-11 px-4 sm:px-6 rounded-xl text-sm font-medium transition-all active:scale-[0.98]", isDark ? "bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08]" : "bg-neutral-100 border border-neutral-200 text-neutral-500 hover:bg-neutral-200")} onClick={() => setStep(s => s - 1)}>← 上一步</button>
              )}
              {canSkip && !loading && (
                <button type="button" className={cn("h-11 px-4 rounded-xl text-sm transition-all", isDark ? "text-white/30 hover:text-white/50" : "text-neutral-400 hover:text-neutral-600")} onClick={skipStep}>跳过</button>
              )}
              <div className="flex-1" />
              {step < 3 ? (
                <button type="button" className="h-11 px-6 sm:px-8 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] text-[var(--theme-fg)] shadow-[0_4px_20px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.2)] hover:shadow-[0_6px_30px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.3)]" style={{ backgroundColor: "var(--theme-color)" }} onClick={nextStep}>下一步 →</button>
              ) : (
                <button type="button" disabled={loading} className="h-11 px-6 sm:px-8 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] text-[var(--theme-fg)] shadow-[0_4px_20px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.2)] disabled:opacity-60 disabled:cursor-not-allowed" style={{ backgroundColor: "var(--theme-color)" }} onClick={handleSubmit}>
                  {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />{SUBMIT_STAGES[submitStage]}</span> : "✨ 确认并初始化"}
                </button>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/10 to-transparent" />
        </div>
      </div>
    </>
  )
}

/* ── 子组件 ── */
function Field({ label, required, hint, isDark, children }: { label: string; required?: boolean; hint?: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      <label className={cn("flex items-center gap-1.5 text-sm font-medium", isDark ? "text-white/55" : "text-neutral-600")}>
        {label}{required && <span className="text-[var(--theme-color)] text-xs">*</span>}
      </label>
      {children}
      {hint && <p className={cn("text-[11px]", isDark ? "text-white/20" : "text-neutral-400")}>{hint}</p>}
    </div>
  )
}

function SummaryRow({ label, value, isDark, accent, children }: { label: string; value?: string; isDark: boolean; accent?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 sm:py-3">
      <span className={cn("text-sm", isDark ? "text-white/35" : "text-neutral-400")}>{label}</span>
      {children || <span className={cn("text-sm font-medium", accent ? "text-[var(--theme-color)]" : (isDark ? "text-white/70" : "text-neutral-700"))}>{value}</span>}
    </div>
  )
}

/* ── 预览面板（桌面端内联 + 移动端折叠共用） ── */
function PreviewPanel({ form, logoPreview, step, isDark }: {
  form: FormData; logoPreview: string; step: number; isDark: boolean
}) {
  return (
    <div className={cn("rounded-xl overflow-hidden border transition-colors", isDark ? "border-white/[0.06] bg-[#121215]" : "border-neutral-200 bg-white")}>
      <div className="flex items-center gap-2 px-3 h-9 border-b" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
        {form.siteLogo ? <img src={logoPreview || form.siteLogo} alt="" className="w-4 h-4 rounded object-contain" /> : <span className="text-xs">🎮</span>}
        <span className={cn("text-[11px] font-semibold truncate", isDark ? "text-white/80" : "text-neutral-700")}>{form.siteName || "Fangame"}</span>
      </div>
      <div className="p-3 space-y-3">
        {(step === 0 || step === 1) && (
          <div className="space-y-2.5">
            <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-white/20" : "text-neutral-400")}>主题色效果</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className="h-7 px-3 rounded-lg text-[11px] font-semibold text-[var(--theme-fg)]" style={{ backgroundColor: "var(--theme-color)" }}>主要按钮</button>
              <button type="button" className={cn("h-7 px-3 rounded-lg text-[11px] font-medium border", isDark ? "border-white/10 text-white/60" : "border-neutral-200 text-neutral-600")}>次要按钮</button>
            </div>
            <div className={cn("h-8 rounded-lg px-3 flex items-center text-[11px] border", isDark ? "bg-white/[0.04] border-white/[0.08] text-white/30" : "bg-neutral-50 border-neutral-200 text-neutral-400")}>
              输入框聚焦态...
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--theme-color)] text-[11px] font-medium">主题链接</span>
              <span className={cn("text-[11px]", isDark ? "text-white/30" : "text-neutral-400")}>普通文本</span>
            </div>
          </div>
        )}
        {(step === 1 || step === 3) && (
          <div className="space-y-2">
            {step === 1 ? (
              <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-white/20" : "text-neutral-400")}>标签分类效果</p>
            ) : (
              <div className={cn("border-t pt-2.5", isDark ? "border-white/[0.06]" : "border-neutral-200")}>
                <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-white/20" : "text-neutral-400")}>标签分类</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAG_GROUPS.map(g => {
                const c = form.tagGroupColors[g.id] || g.color
                return (
                  <span key={g.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border" style={{ color: c, background: `${c}15`, borderColor: `${c}30` }}>
                    {g.name.replace("标签", "")}
                  </span>
                )
              })}
            </div>
            <p className={cn("text-[9px]", isDark ? "text-white/15" : "text-neutral-300")}>首页卡片 · 详情页 · 发现页 · 资源</p>
          </div>
        )}
        {step === 2 && form.username && (
          <div className="space-y-2">
            <p className={cn("text-[10px] uppercase tracking-wider", isDark ? "text-white/20" : "text-neutral-400")}>站长信息</p>
            <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2", isDark ? "bg-white/[0.04]" : "bg-neutral-50")}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-[var(--theme-fg)]" style={{ backgroundColor: "var(--theme-color)" }}>{form.username[0]?.toUpperCase()}</div>
              <div>
                <p className={cn("text-[11px] font-medium", isDark ? "text-white/80" : "text-neutral-700")}>{form.username}</p>
                <p className={cn("text-[9px]", isDark ? "text-white/25" : "text-neutral-400")}>SUPER_ADMIN</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className={cn("flex items-center justify-center h-6 border-t text-[9px]", isDark ? "border-white/[0.04] text-white/15" : "border-neutral-100 text-neutral-400")}>
        {form.siteName || "Fangame"} · 资源大厅
      </div>
    </div>
  )
}
