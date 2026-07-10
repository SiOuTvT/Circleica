"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { applyThemeColor } from "@/lib/theme-colors"
import { cn } from "@/lib/utils"

/* ── 主题色预设（复用 theme-editor.tsx） ── */
const THEME_PRESETS = [
  { name: "peach", label: "暖桃", color: "#E0A87C", desc: "温柔 · 质感" },
  { name: "rose", label: "柔玫瑰", color: "#e8789a", desc: "温暖 · 怀旧" },
  { name: "lavender", label: "雾蓝紫", color: "#9B8EC4", desc: "梦幻 · 小众" },
  { name: "copper", label: "暖铜", color: "#C49464", desc: "复古 · 高级" },
  { name: "amber", label: "暖琥珀", color: "#D4A050", desc: "温暖 · 复古" },
  { name: "mist", label: "雾蓝", color: "#7CA8C8", desc: "安静 · 治愈" },
  { name: "tea", label: "茶绿", color: "#8CB888", desc: "清新 · 自然" },
  { name: "slate", label: "烟灰蓝", color: "#8898A8", desc: "沉稳 · 内敛" },
  { name: "mint", label: "薄荷", color: "#78C0B0", desc: "清凉 · 干净" },
  { name: "apricot", label: "杏橘", color: "#E89868", desc: "活泼 · 温暖" },
]

/* ── 类型 ── */
interface FormData {
  siteName: string
  siteDescription: string
  siteLogo: string
  placeholderImage: string
  registrationEnabled: boolean
  themeColor: string
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
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
}

const STEPS = [
  { label: "站点信息", icon: "⚙️" },
  { label: "站长账号", icon: "👤" },
  { label: "确认初始化", icon: "✨" },
]

/* ── 错误信息映射 ── */
function friendlyError(msg: string): string {
  if (msg.includes("already_initialized") || msg.includes("已完成初始化")) return "站点已初始化，请勿重复操作"
  if (msg.includes("用户名") && msg.includes("重复")) return "该用户名已被使用，请更换"
  if (msg.includes("unique") || msg.includes("duplicate")) return "数据冲突，请检查输入是否重复"
  if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) return "网络超时，请检查网络后重试"
  if (msg.includes("fetch")) return "网络连接失败，请检查网络"
  return msg
}

/* ── 密码强度检测 ── */
function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: "", color: "" }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { level: 1, label: "弱", color: "bg-red-400" }
  if (score <= 2) return { level: 2, label: "一般", color: "bg-amber-400" }
  if (score <= 3) return { level: 3, label: "良好", color: "bg-emerald-400" }
  return { level: 4, label: "强", color: "bg-emerald-500" }
}

/* ── 提交阶段文案 ── */
const SUBMIT_STAGES = [
  "正在创建站点...",
  "正在保存配置...",
  "正在创建站长账号...",
  "正在完成初始化...",
]

/* ── 样式 token ── */
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

  const isDark = mode === "dark"
  const pwStrength = getPasswordStrength(form.password)

  /* ── 初始化：保存原始 classList，应用默认主题色 ── */
  useEffect(() => {
    origClassesRef.current = document.documentElement.className
    applyThemeColor(form.themeColor)
    return () => {
      document.documentElement.className = origClassesRef.current
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── 明暗切换（仅向导页面） ── */
  const toggleMode = useCallback(() => {
    setMode(prev => {
      const next = prev === "dark" ? "light" : "dark"
      const root = document.documentElement
      root.classList.toggle("light", next === "light")
      root.classList.toggle("dark", next !== "light")
      applyThemeColor(form.themeColor)
      return next
    })
  }, [form.themeColor])

  const update = (key: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setError("")
  }

  /* ── 主题色选择 ── */
  function selectThemeColor(color: string) {
    update("themeColor", color)
    applyThemeColor(color)
  }

  /* ── Logo 上传 ── */
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

  /* ── 步骤验证 ── */
  function validateStep(): boolean {
    setError("")
    if (step === 0) {
      if (!form.siteName.trim()) { setError("站点名称不能为空"); return false }
      if (form.siteName.trim().length > 50) { setError("站点名称不超过 50 个字符"); return false }
      return true
    }
    if (step === 1) {
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

  function nextStep() {
    if (validateStep()) setStep(s => s + 1)
  }

  /* ── 提交（带阶段进度） ── */
  async function handleSubmit() {
    if (loading) return
    setLoading(true)
    setError("")
    setSubmitStage(0)

    // 模拟阶段进度（实际是单次 API，但给用户明确反馈感）
    const stageTimer = setInterval(() => {
      setSubmitStage(prev => Math.min(prev + 1, SUBMIT_STAGES.length - 1))
    }, 800)

    try {
      setSubmitStage(0)
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
          admin: {
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "初始化失败")

      setSubmitStage(2)

      // 将主题色写入 localStorage，ThemeProvider 启动后会读取
      const themeSettings = { themeColor: form.themeColor, themeRadius: 12, themeShadowIntensity: 50, themeAlpha: 15 }
      localStorage.setItem("site-theme-settings", JSON.stringify(themeSettings))
      localStorage.setItem("site-theme-color", form.themeColor)

      setSubmitStage(3)
      const signInResult = await signIn("credentials", {
        redirect: false,
        username: form.username.trim(),
        password: form.password,
      })

      if (signInResult?.ok) {
        // 初始化成功 → 显示欢迎页（不直接跳转，让用户确认）
        router.refresh()
        setCompleted(true)
      } else {
        // signIn 失败不阻断，跳登录页手动登录
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

  /* ── 欢迎页（初始化完成后） ── */
  if (completed) {
    const themeLabel = THEME_PRESETS.find(p => p.color === form.themeColor)?.label || "自定义"
    return (
      <div className={cn(
        "fixed inset-0 flex items-center justify-center p-4 overflow-auto transition-colors duration-500",
        isDark ? "bg-[#0a0a0f]" : "bg-[#f8f7f4]",
      )}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.08]",
            isDark ? "bg-[var(--theme-color)]" : "bg-[var(--theme-color)]",
          )} />
        </div>

        <div className={cn(
          "relative z-10 w-full max-w-md rounded-2xl overflow-hidden text-center transition-colors duration-500",
          isDark
            ? "bg-white/[0.03] border border-white/[0.06] shadow-[0_8px_60px_rgba(0,0,0,0.5)]"
            : "bg-white border border-neutral-200 shadow-[0_8px_40px_rgba(0,0,0,0.08)]",
        )} style={{ animation: "wiz-fade-in 0.6s ease-out" }}>
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-color)]/30 to-transparent" />

          <div className="p-8 sm:p-10 space-y-6">
            <div className="text-5xl" style={{ animation: "wiz-fade-in 0.8s ease-out" }}>🎉</div>

            <div>
              <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-neutral-900")}>
                站点初始化完成
              </h1>
              <p className={cn("text-sm mt-2", isDark ? "text-white/40" : "text-neutral-400")}>
                {form.siteName} 已准备就绪
              </p>
            </div>

            <div className={cn(
              "rounded-xl overflow-hidden divide-y text-left",
              isDark ? "bg-white/[0.03] border border-white/[0.06] divide-white/[0.05]"
                : "bg-neutral-50 border border-neutral-200 divide-neutral-200",
            )}>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className={cn("text-sm", isDark ? "text-white/35" : "text-neutral-400")}>站点</span>
                <span className={cn("text-sm font-medium", isDark ? "text-white/75" : "text-neutral-700")}>
                  {form.siteName}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className={cn("text-sm", isDark ? "text-white/35" : "text-neutral-400")}>主题</span>
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: form.themeColor }} />
                  <span className={cn("text-sm font-medium", isDark ? "text-white/75" : "text-neutral-700")}>{themeLabel}</span>
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className={cn("text-sm", isDark ? "text-white/35" : "text-neutral-400")}>站长</span>
                <span className={cn("text-sm font-medium", isDark ? "text-white/75" : "text-neutral-700")}>
                  {form.username}
                </span>
              </div>
            </div>

            <p className={cn("text-xs", isDark ? "text-white/25" : "text-neutral-400")}>
              接下来你可以配置存储、上传游戏内容、自定义站点页面
            </p>

            <div className="flex gap-3">
              <button type="button"
                className={cn(
                  "flex-1 h-11 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                  isDark
                    ? "bg-white/[0.06] border border-white/[0.08] text-white/70 hover:bg-white/[0.1] hover:text-white"
                    : "bg-neutral-100 border border-neutral-200 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-800",
                )}
                onClick={() => router.push("/")}>
                查看网站
              </button>
              <button type="button"
                className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]
                           text-[var(--theme-fg)] shadow-[0_4px_20px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.2)]
                           hover:shadow-[0_6px_30px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.3)] hover:brightness-110"
                style={{ backgroundColor: "var(--theme-color)" }}
                onClick={() => router.push("/admin")}>
                进入后台 →
              </button>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/10 to-transparent" />
        </div>
      </div>
    )
  }

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

      {/* ── 全屏容器 ── */}
      <div className={cn(
        "fixed inset-0 flex items-center justify-center p-4 overflow-auto transition-colors duration-500",
        isDark ? "bg-[#0a0a0f]" : "bg-[#f8f7f4]",
      )}>
        {/* 背景微光 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={cn(
            "absolute -top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.06]",
            isDark ? "bg-amber-400" : "bg-amber-300",
          )} />
          <div className={cn(
            "absolute -bottom-1/4 -right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.04]",
            isDark ? "bg-purple-400" : "bg-orange-200",
          )} />
        </div>

        {/* ── 主卡片 ── */}
        <div className={cn(
          "wiz-card relative z-10 w-full max-w-5xl rounded-2xl overflow-hidden transition-colors duration-500",
          isDark
            ? "bg-white/[0.03] border border-white/[0.06] shadow-[0_8px_60px_rgba(0,0,0,0.5)]"
            : "bg-white border border-neutral-200 shadow-[0_8px_40px_rgba(0,0,0,0.08)]",
        )} style={{ animation: "wiz-fade-in 0.5s ease-out" }}>

          {/* 顶部光晕线 */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--theme-color)]/20 to-transparent" />

          {/* ── 右上角：明暗切换 ── */}
          <button
            type="button"
            onClick={toggleMode}
            className={cn(
              "absolute top-4 right-4 z-20 w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all duration-200",
              isDark
                ? "bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white/80"
                : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600",
            )}
            title={isDark ? "切换到浅色预览" : "切换到深色预览"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          <div className="p-6 sm:p-8">

            {/* ── 标题区 ── */}
            <div className="text-center mb-6">
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs mb-3",
                isDark
                  ? "bg-[var(--theme-color)]/10 text-[var(--theme-color)] border border-[var(--theme-color)]/20"
                  : "bg-[var(--theme-color)]/8 text-[var(--theme-color)] border border-[var(--theme-color)]/15",
              )}>
                站点初始化向导
              </div>
              <h1 className={cn(
                "text-xl sm:text-2xl font-bold tracking-tight",
                isDark ? "text-white" : "text-neutral-900",
              )}>
                欢迎使用 Fangame
              </h1>
              <p className={cn("text-sm mt-1", isDark ? "text-white/35" : "text-neutral-400")}>
                配置你的站点，首次部署只需 1 分钟
              </p>
            </div>

            {/* ── 步骤进度条 ── */}
            <div className="flex items-center justify-center gap-0 px-4 mb-8">
              {STEPS.map((s, i) => {
                const done = i < step
                const active = i === step
                return (
                  <div key={s.label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center relative">
                      <div
                        className={cn(
                          "relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-500 shrink-0",
                          done && "bg-[var(--theme-color)] text-[var(--theme-fg)]",
                          active && "border-2 border-[var(--theme-color)]/60 text-[var(--theme-color)]",
                          !done && !active && (
                            isDark
                              ? "bg-white/[0.05] text-white/25 border border-white/[0.08]"
                              : "bg-neutral-100 text-neutral-300 border border-neutral-200"
                          ),
                        )}
                        style={active ? { animation: "wiz-glow 2.5s ease-in-out infinite" } : undefined}
                      >
                        {done ? "✓" : s.icon}
                      </div>
                      <span className={cn(
                        "absolute -bottom-5 text-[10px] sm:text-xs whitespace-nowrap transition-colors duration-300",
                        active ? "text-[var(--theme-color)] font-medium" : done
                          ? (isDark ? "text-white/45" : "text-neutral-500")
                          : (isDark ? "text-white/20" : "text-neutral-300"),
                      )}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={cn(
                        "flex-1 mx-2 sm:mx-3 h-0.5 rounded-full overflow-hidden relative",
                        isDark ? "bg-white/[0.06]" : "bg-neutral-200",
                      )}>
                        <div className={cn(
                          "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
                          done ? "w-full bg-[var(--theme-color)]" : "w-0",
                        )} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="h-2" />

            {/* ── 错误提示 ── */}
            {error && (
              <div className={cn(
                "flex items-center gap-2 text-sm rounded-lg px-4 py-3 mb-4",
                isDark
                  ? "text-red-300 bg-red-500/[0.08] border border-red-500/20"
                  : "text-red-600 bg-red-50 border border-red-200",
              )} style={{ animation: "wiz-fade-in 0.3s ease-out" }}>
                <span>⚠</span> {error}
              </div>
            )}

            {/* ── 内容区：表单 + 预览 ── */}
            <div className="flex flex-col lg:flex-row gap-6">

              {/* ── 左侧：表单 ── */}
              <div className="flex-1 min-w-0">

                {/* ─── Step 1: 站点信息 ─── */}
                {step === 0 && (
                  <div className="space-y-5" style={{ animation: "wiz-fade-in 0.4s ease-out" }}>
                    <Field label="站点名称" required isDark={isDark}
                      hint="显示在网站标题、Header、Footer 和 SEO 中">
                      <input className={inputBase} value={form.siteName}
                        onChange={e => update("siteName", e.target.value)}
                        placeholder="同人游戏站" maxLength={50} />
                    </Field>

                    <Field label="站点描述" isDark={isDark}
                      hint="用于 SEO description 和网站首页介绍">
                      <input className={inputBase} value={form.siteDescription}
                        onChange={e => update("siteDescription", e.target.value)}
                        placeholder="面向 Galgame/视觉小说爱好者的社区平台" />
                    </Field>

                    <Field label="站点 Logo" isDark={isDark}
                      hint="建议 120×120 透明底 PNG，最大 2MB">
                      <div className="flex items-center gap-3">
                        {logoPreview || form.siteLogo ? (
                          <img src={logoPreview || form.siteLogo} alt="Logo"
                            className="h-11 w-11 rounded-lg object-contain bg-white/10 border border-white/10" />
                        ) : (
                          <div className={cn(
                            "h-11 w-11 rounded-lg flex items-center justify-center text-lg border border-dashed",
                            isDark ? "bg-white/[0.04] border-white/[0.1] text-white/20" : "bg-neutral-50 border-neutral-200 text-neutral-300",
                          )}>🎮</div>
                        )}
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        <button type="button" disabled={uploading}
                          className={cn(
                            "h-9 px-4 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95",
                            isDark
                              ? "bg-white/[0.06] border border-white/[0.1] text-white/70 hover:bg-white/[0.1] hover:text-white"
                              : "bg-neutral-100 border border-neutral-200 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-800",
                            "disabled:opacity-40 disabled:cursor-not-allowed",
                          )}
                          onClick={() => fileRef.current?.click()}>
                          {uploading ? "上传中..." : "选择图片"}
                        </button>
                        {form.siteLogo && (
                          <button type="button"
                            className={cn("text-xs transition-colors", isDark ? "text-white/30 hover:text-red-400" : "text-neutral-400 hover:text-red-500")}
                            onClick={() => { update("siteLogo", ""); setLogoPreview("") }}>
                            移除
                          </button>
                        )}
                      </div>
                    </Field>

                    <Field label="主题色" isDark={isDark}
                      hint="影响按钮、链接、高亮等全局配色，初始化后可在后台修改">
                      <div className="grid grid-cols-5 gap-2">
                        {THEME_PRESETS.map(p => {
                          const selected = form.themeColor === p.color
                          return (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => selectThemeColor(p.color)}
                              className={cn(
                                "group relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200",
                                selected
                                  ? "bg-[var(--theme-color)]/10 ring-2 ring-[var(--theme-color)]/40 scale-[1.02]"
                                  : (isDark ? "hover:bg-white/[0.04]" : "hover:bg-neutral-50"),
                              )}
                              title={`${p.label} — ${p.desc}`}
                            >
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-full transition-all duration-200 relative",
                                  selected && "ring-2 ring-white/30 scale-110",
                                )}
                                style={{ backgroundColor: p.color }}
                              >
                                {selected && (
                                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span className={cn(
                                "text-[10px] leading-tight text-center",
                                selected
                                  ? "text-[var(--theme-color)] font-medium"
                                  : (isDark ? "text-white/35" : "text-neutral-500"),
                              )}>
                                {p.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </Field>

                    <Field label="注册策略" isDark={isDark}>
                      <select
                        value={form.registrationEnabled ? "1" : "0"}
                        onChange={e => update("registrationEnabled", e.target.value === "1")}
                        className={cn(
                          inputBase,
                          "appearance-none cursor-pointer",
                          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23ffffff60%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')]",
                          "bg-no-repeat bg-[position:right_14px_center]",
                          "[&>option]:bg-[#1a1a24] [&>option]:text-white/80",
                        )}
                      >
                        <option value="1">开放注册 — 允许新用户注册</option>
                        <option value="0">关闭注册 — 仅管理员可创建用户</option>
                      </select>
                    </Field>
                  </div>
                )}

                {/* ─── Step 2: 站长账号 ─── */}
                {step === 1 && (
                  <div className="space-y-5" style={{ animation: "wiz-fade-in 0.4s ease-out" }}>
                    {/* 角色说明 */}
                    <div className={cn(
                      "flex items-start gap-3 rounded-xl px-4 py-3 text-sm",
                      isDark ? "bg-[var(--theme-color)]/5 border border-[var(--theme-color)]/10" : "bg-amber-50 border border-amber-100",
                    )}>
                      <span className="text-lg mt-0.5">👑</span>
                      <div>
                        <p className={cn("font-medium", isDark ? "text-[var(--theme-color)]" : "text-amber-800")}>
                          创建站长账号（Owner）
                        </p>
                        <p className={cn("text-xs mt-0.5", isDark ? "text-white/40" : "text-amber-600/70")}>
                          站长拥有最高权限，负责管理整个站点。此账号唯一，后续可在后台修改信息。
                        </p>
                      </div>
                    </div>

                    <Field label="用户名" required isDark={isDark}
                      hint="登录后台使用的账号名，2-20 个字符">
                      <input className={inputBase} value={form.username}
                        onChange={e => update("username", e.target.value)}
                        placeholder="admin" maxLength={20} />
                    </Field>

                    <Field label="邮箱" isDark={isDark}
                      hint="可选。用于密码重置，暂时不填可以之后在后台补充">
                      <input className={inputBase} type="email" value={form.email}
                        onChange={e => update("email", e.target.value)}
                        placeholder="admin@example.com（可选）" />
                    </Field>

                    <Field label="密码" required isDark={isDark}>
                      <div className="relative">
                        <input className={cn(inputBase, "pr-10")} type={showPw ? "text" : "password"}
                          value={form.password}
                          onChange={e => update("password", e.target.value)}
                          placeholder="至少 8 个字符" />
                        <button type="button"
                          className={cn(
                            "absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-colors",
                            isDark ? "text-white/25 hover:text-white/50" : "text-neutral-300 hover:text-neutral-500",
                          )}
                          onClick={() => setShowPw(v => !v)}
                          tabIndex={-1}>
                          {showPw ? "🙈" : "👁️"}
                        </button>
                      </div>
                      {/* 密码强度指示器 */}
                      {form.password.length > 0 && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 flex gap-1">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className={cn(
                                "h-1 flex-1 rounded-full transition-all duration-300",
                                i <= pwStrength.level ? pwStrength.color : (isDark ? "bg-white/[0.06]" : "bg-neutral-200"),
                              )} />
                            ))}
                          </div>
                          <span className={cn("text-[11px] tabular-nums",
                            pwStrength.level <= 1 ? "text-red-400" :
                            pwStrength.level <= 2 ? "text-amber-400" : "text-emerald-400",
                          )}>
                            {pwStrength.label}
                          </span>
                        </div>
                      )}
                    </Field>

                    <Field label="确认密码" required isDark={isDark}>
                      <div className="relative">
                        <input className={cn(inputBase, "pr-10")} type={showPw2 ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={e => update("confirmPassword", e.target.value)}
                          placeholder="再次输入密码" />
                        <button type="button"
                          className={cn(
                            "absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-colors",
                            isDark ? "text-white/25 hover:text-white/50" : "text-neutral-300 hover:text-neutral-500",
                          )}
                          onClick={() => setShowPw2(v => !v)}
                          tabIndex={-1}>
                          {showPw2 ? "🙈" : "👁️"}
                        </button>
                      </div>
                      {form.confirmPassword && form.password !== form.confirmPassword && (
                        <p className="text-[11px] text-red-400 mt-1">两次密码不一致</p>
                      )}
                    </Field>

                    {/* 安全提示 */}
                    <div className={cn(
                      "flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs",
                      isDark ? "text-white/25 bg-white/[0.02] border border-white/[0.04]"
                        : "text-neutral-400 bg-neutral-50 border border-neutral-100",
                    )}>
                      <span className="mt-px shrink-0">🔐</span>
                      <span>该账号拥有管理网站的最高权限，请妥善保存密码。初始化完成后可在后台修改账号信息。</span>
                    </div>
                  </div>
                )}

                {/* ─── Step 3: 确认初始化 ─── */}
                {step === 2 && (
                  <div className="space-y-4" style={{ animation: "wiz-fade-in 0.4s ease-out" }}>
                    <p className={cn("text-sm", isDark ? "text-white/40" : "text-neutral-400")}>
                      请确认以下站点配置：
                    </p>
                    <div className={cn(
                      "rounded-xl overflow-hidden divide-y",
                      isDark
                        ? "bg-white/[0.03] border border-white/[0.06] divide-white/[0.05]"
                        : "bg-neutral-50 border border-neutral-200 divide-neutral-200",
                    )}>
                      <SummaryRow label="站点名称" value={form.siteName} isDark={isDark} />
                      {form.siteDescription && <SummaryRow label="站点描述" value={form.siteDescription} isDark={isDark} />}
                      <SummaryRow label="Logo" isDark={isDark}>
                        {form.siteLogo ? (
                          <span className="flex items-center gap-2">
                            <img src={logoPreview || form.siteLogo} alt="" className="w-6 h-6 rounded object-contain" />
                            <span className={cn("text-sm", isDark ? "text-white/60" : "text-neutral-500")}>已上传</span>
                          </span>
                        ) : (
                          <span className={cn("text-sm", isDark ? "text-white/30" : "text-neutral-400")}>使用默认</span>
                        )}
                      </SummaryRow>
                      <SummaryRow label="主题色" isDark={isDark}>
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: form.themeColor }} />
                          <span className={cn("text-sm font-medium", isDark ? "text-white/70" : "text-neutral-700")}>
                            {THEME_PRESETS.find(p => p.color === form.themeColor)?.label || form.themeColor}
                          </span>
                        </span>
                      </SummaryRow>
                      <SummaryRow label="注册策略" value={form.registrationEnabled ? "开放注册" : "关闭注册"} isDark={isDark} />
                      <SummaryRow label="站长账号" value={form.username} isDark={isDark} accent />
                      {form.email && <SummaryRow label="邮箱" value={form.email} isDark={isDark} />}
                    </div>

                    {/* 提示 */}
                    <div className={cn(
                      "flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs",
                      isDark ? "text-white/30 bg-white/[0.02]" : "text-neutral-400 bg-neutral-50",
                    )}>
                      <span className="mt-px">💡</span>
                      <span>初始化完成后，所有配置都可以在后台「站点设置」中随时修改。</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 右侧：实时预览面板 ── */}
              <div className="lg:w-[320px] shrink-0">
                <div className={cn(
                  "rounded-xl overflow-hidden border transition-colors duration-300",
                  isDark ? "border-white/[0.06] bg-[#121215]" : "border-neutral-200 bg-white",
                )}>
                  {/* 预览 Header */}
                  <div className="flex items-center gap-2 px-3 h-10 border-b transition-colors duration-300"
                    style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    {form.siteLogo ? (
                      <img src={logoPreview || form.siteLogo} alt="" className="w-5 h-5 rounded object-contain" />
                    ) : (
                      <span className="text-sm">🎮</span>
                    )}
                    <span className={cn("text-xs font-semibold truncate", isDark ? "text-white/80" : "text-neutral-700")}>
                      {form.siteName || "Fangame"}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-color)]" />
                      <div className={cn("w-1.5 h-1.5 rounded-full", isDark ? "bg-white/15" : "bg-neutral-200")} />
                      <div className={cn("w-1.5 h-1.5 rounded-full", isDark ? "bg-white/15" : "bg-neutral-200")} />
                    </div>
                  </div>

                  {/* 预览 Nav */}
                  <div className="flex items-center gap-3 px-3 h-8 border-b transition-colors duration-300"
                    style={{ borderColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
                    {["首页", "游戏", "论坛"].map((t, i) => (
                      <span key={t} className={cn("text-[10px]",
                        i === 0 ? "text-[var(--theme-color)] font-medium" : (isDark ? "text-white/25" : "text-neutral-400")
                      )}>{t}</span>
                    ))}
                  </div>

                  {/* 预览游戏卡片 */}
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={cn(
                          "rounded-lg overflow-hidden transition-colors duration-300",
                          isDark ? "bg-white/[0.04]" : "bg-neutral-50 border border-neutral-100",
                        )}>
                          <div className={cn(
                            "aspect-[3/4] flex items-center justify-center text-lg",
                            isDark ? "bg-white/[0.03]" : "bg-neutral-100",
                          )}>🎮</div>
                          <div className="p-1.5">
                            <div className={cn("text-[9px] truncate mb-0.5", isDark ? "text-white/60" : "text-neutral-600")}>
                              游戏名称 {i}
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <span key={s} className="text-[7px]" style={{ color: s <= 4 ? form.themeColor : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") }}>★</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="w-full h-7 rounded-lg text-[10px] font-semibold transition-all duration-200 text-[var(--theme-fg)]"
                      style={{ backgroundColor: "var(--theme-color)" }}
                    >
                      查看更多游戏
                    </button>
                  </div>

                  {/* 预览 Footer */}
                  <div className={cn(
                    "flex items-center justify-center h-7 border-t text-[9px] transition-colors duration-300",
                    isDark ? "border-white/[0.04] text-white/20" : "border-neutral-100 text-neutral-400",
                  )}>
                    {form.siteName || "Fangame"} · 资源大厅
                  </div>
                </div>
              </div>
            </div>

            {/* ── 操作按钮 ── */}
            <div className="flex gap-3 mt-6">
              {step > 0 && !loading && (
                <button type="button"
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                    isDark
                      ? "bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
                      : "bg-neutral-100 border border-neutral-200 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700",
                  )}
                  onClick={() => setStep(s => s - 1)}>
                  ← 上一步
                </button>
              )}
              {step < 2 ? (
                <button type="button"
                  className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]
                             text-[var(--theme-fg)] shadow-[0_4px_20px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.2)]
                             hover:shadow-[0_6px_30px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.3)] hover:brightness-110"
                  style={{ backgroundColor: "var(--theme-color)" }}
                  onClick={nextStep}>
                  下一步 →
                </button>
              ) : (
                <button type="button" disabled={loading}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]
                             text-[var(--theme-fg)] shadow-[0_4px_20px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.2)]
                             hover:shadow-[0_6px_30px_rgba(var(--theme-r),var(--theme-g),var(--theme-b),0.3)] hover:brightness-110
                             disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "var(--theme-color)" }}
                  onClick={handleSubmit}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      {SUBMIT_STAGES[submitStage]}
                    </span>
                  ) : "✨ 确认并初始化"}
                </button>
              )}
            </div>
          </div>

          {/* 底部光晕线 */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/10 to-transparent" />
        </div>
      </div>
    </>
  )
}

/* ── 子组件 ── */

function Field({ label, required, hint, isDark, children }: {
  label: string; required?: boolean; hint?: string; isDark: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <label className={cn("flex items-center gap-1.5 text-sm font-medium",
        isDark ? "text-white/55" : "text-neutral-600",
      )}>
        {label}
        {required && <span className="text-[var(--theme-color)] text-xs">*</span>}
      </label>
      {children}
      {hint && <p className={cn("text-[11px]", isDark ? "text-white/20" : "text-neutral-400")}>{hint}</p>}
    </div>
  )
}

function SummaryRow({ label, value, isDark, accent, children }: {
  label: string; value?: string; isDark: boolean; accent?: boolean; children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className={cn("text-sm", isDark ? "text-white/35" : "text-neutral-400")}>{label}</span>
      {children || (
        <span className={cn("text-sm font-medium",
          accent ? "text-[var(--theme-color)]" : (isDark ? "text-white/70" : "text-neutral-700"),
        )}>{value}</span>
      )}
    </div>
  )
}
