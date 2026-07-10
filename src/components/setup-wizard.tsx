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
  { label: "网站设置", icon: "⚙️" },
  { label: "管理员", icon: "👤" },
  { label: "完成", icon: "✨" },
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
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"dark" | "light">("dark")

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
      setError(err instanceof Error ? err.message : "上传失败")
    } finally {
      setUploading(false)
    }
  }

  /* ── 步骤验证 ── */
  function validateStep(): boolean {
    setError("")
    if (step === 0) {
      if (!form.siteName.trim()) { setError("网站名称不能为空"); return false }
      return true
    }
    if (step === 1) {
      if (!form.username.trim()) { setError("用户名不能为空"); return false }
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

  /* ── 提交 ── */
  async function handleSubmit() {
    setLoading(true)
    setError("")
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
          admin: {
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "初始化失败")

      // 将主题色写入 localStorage，ThemeProvider 启动后会读取
      const themeSettings = { themeColor: form.themeColor, themeRadius: 12, themeShadowIntensity: 50, themeAlpha: 15 }
      localStorage.setItem("site-theme-settings", JSON.stringify(themeSettings))
      localStorage.setItem("site-theme-color", form.themeColor)

      const signInResult = await signIn("credentials", {
        redirect: false,
        username: form.username.trim(),
        password: form.password,
      })

      if (signInResult?.ok) {
        router.refresh()
        router.push("/")
      } else {
        router.push("/login")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "初始化失败")
    } finally {
      setLoading(false)
    }
  }

  const isDark = mode === "dark"

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
            title={isDark ? "切换到浅色" : "切换到深色"}
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
                首次启动配置向导
              </div>
              <h1 className={cn(
                "text-xl sm:text-2xl font-bold tracking-tight",
                isDark ? "text-white" : "text-neutral-900",
              )}>
                欢迎使用 Fangame
              </h1>
              <p className={cn("text-sm mt-1", isDark ? "text-white/35" : "text-neutral-400")}>
                完成以下配置，启动你的社区平台
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

                {/* Step 1: 网站设置 */}
                {step === 0 && (
                  <div className="space-y-5" style={{ animation: "wiz-fade-in 0.4s ease-out" }}>
                    <Field label="网站名称" required isDark={isDark}>
                      <input className={inputBase} value={form.siteName}
                        onChange={e => update("siteName", e.target.value)} placeholder="同人游戏站" />
                    </Field>

                    <Field label="网站描述" isDark={isDark}>
                      <input className={inputBase} value={form.siteDescription}
                        onChange={e => update("siteDescription", e.target.value)}
                        placeholder="面向 Galgame/视觉小说爱好者的社区平台" />
                    </Field>

                    <Field label="Logo" isDark={isDark}>
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
                          <button type="button" className="text-xs text-white/30 hover:text-red-400 transition-colors"
                            onClick={() => { update("siteLogo", ""); setLogoPreview("") }}>
                            移除
                          </button>
                        )}
                      </div>
                      <p className={cn("mt-1.5 text-[11px]", isDark ? "text-white/20" : "text-neutral-400")}>
                        建议 120×120，最大 2MB
                      </p>
                    </Field>

                    <Field label="主题色" isDark={isDark}>
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
                              title={p.label}
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

                {/* Step 2: 管理员账号 */}
                {step === 1 && (
                  <div className="space-y-5" style={{ animation: "wiz-fade-in 0.4s ease-out" }}>
                    <Field label="用户名" required isDark={isDark}>
                      <input className={inputBase} value={form.username}
                        onChange={e => update("username", e.target.value)} placeholder="admin" />
                    </Field>
                    <Field label="邮箱" isDark={isDark} hint="可选，用于密码重置">
                      <input className={inputBase} type="email" value={form.email}
                        onChange={e => update("email", e.target.value)} placeholder="admin@example.com" />
                    </Field>
                    <Field label="密码" required isDark={isDark} hint="至少 8 个字符">
                      <input className={inputBase} type="password" value={form.password}
                        onChange={e => update("password", e.target.value)} placeholder="••••••••" />
                    </Field>
                    <Field label="确认密码" required isDark={isDark}>
                      <input className={inputBase} type="password" value={form.confirmPassword}
                        onChange={e => update("confirmPassword", e.target.value)} placeholder="••••••••" />
                    </Field>
                  </div>
                )}

                {/* Step 3: 确认 */}
                {step === 2 && (
                  <div className="space-y-4" style={{ animation: "wiz-fade-in 0.4s ease-out" }}>
                    <p className={cn("text-sm", isDark ? "text-white/40" : "text-neutral-400")}>
                      请确认以下配置信息：
                    </p>
                    <div className={cn(
                      "rounded-xl overflow-hidden divide-y",
                      isDark
                        ? "bg-white/[0.03] border border-white/[0.06] divide-white/[0.05]"
                        : "bg-neutral-50 border border-neutral-200 divide-neutral-200",
                    )}>
                      <SummaryRow label="网站名称" value={form.siteName} isDark={isDark} />
                      {form.siteDescription && <SummaryRow label="网站描述" value={form.siteDescription} isDark={isDark} />}
                      {form.siteLogo && <SummaryRow label="Logo" value="已上传 ✓" isDark={isDark} />}
                      <SummaryRow label="主题色" isDark={isDark}>
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: form.themeColor }} />
                          <span>{THEME_PRESETS.find(p => p.color === form.themeColor)?.label || form.themeColor}</span>
                        </span>
                      </SummaryRow>
                      <SummaryRow label="注册策略" value={form.registrationEnabled ? "开放注册" : "关闭注册"} isDark={isDark} />
                      <SummaryRow label="站长账号" value={form.username} isDark={isDark} accent />
                      {form.email && <SummaryRow label="邮箱" value={form.email} isDark={isDark} />}
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
                    {/* 主题色按钮预览 */}
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
              {step > 0 && (
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
                      正在初始化...
                    </span>
                  ) : "✨ 完成初始化"}
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
    <div className={cn(
      "flex items-center justify-between px-4 py-3",
      isDark ? "" : "",
    )}>
      <span className={cn("text-sm", isDark ? "text-white/35" : "text-neutral-400")}>{label}</span>
      {children || (
        <span className={cn("text-sm font-medium",
          accent ? "text-[var(--theme-color)]" : (isDark ? "text-white/70" : "text-neutral-700"),
        )}>{value}</span>
      )}
    </div>
  )
}
