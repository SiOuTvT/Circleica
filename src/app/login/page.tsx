"use client"

import { TurnstileCaptcha } from "@/components/turnstile-captcha"
import { useEmotionalMessage } from "@/hooks/use-emotional-messages"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"login" | "register">("login")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  // 登录表单
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // 注册表单
  const [regForm, setRegForm] = useState({ username: "", email: "", password: "", confirm: "" })
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const { message: regMsg } = useEmotionalMessage("success_register")
  const handleCaptchaVerify = useCallback((token: string) => setCaptchaToken(token), [])

  useEffect(() => {
    if (searchParams.get("tab") === "register") setTab("register")
  }, [searchParams])

  function setReg(k: keyof typeof regForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setRegForm((f) => ({ ...f, [k]: e.target.value }))
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await signIn("credentials", { identifier, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError("账号或密码错误")
    } else {
      const callbackUrl = searchParams.get("callbackUrl")
      // 安全修复：仅允许同源路径，防止开放重定向漏洞
      const safeUrl = callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") && !callbackUrl.includes("://")
        ? callbackUrl
        : "/"
      router.push(safeUrl)
      router.refresh()
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!regForm.username.trim()) { setError("请输入用户名"); return }
    if (!regForm.email.trim()) { setError("请输入邮箱"); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regForm.email)) { setError("邮箱格式不正确"); return }
    if (regForm.password.length < 6) { setError("密码至少6位"); return }
    if (regForm.password !== regForm.confirm) { setError("两次密码不一致"); return }
    const hasTurnstile = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (hasTurnstile && !captchaToken) { setError("请完成验证码验证"); return }
    setLoading(true)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: regForm.username, email: regForm.email, password: regForm.password, captchaToken }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    // 注册成功后自动切换到登录
    setTab("login")
    setError("")
    setSuccess(regMsg ? `${regMsg.emoji} ${regMsg.title}` : "注册成功！请登录")
    setIdentifier(regForm.username)
    setPassword("")
  }

  const regFields = [
    { key: "username" as const, icon: User, type: "text", placeholder: "用户名", autoComplete: "username" },
    { key: "email" as const, icon: Mail, type: "email", placeholder: "邮箱地址", autoComplete: "email" },
    { key: "password" as const, icon: Lock, type: "password", placeholder: "密码（至少6位，建议包含字母+数字）", autoComplete: "new-password", minLength: 6 },
    { key: "confirm" as const, icon: CheckCircle2, type: "password", placeholder: "确认密码", autoComplete: "new-password" },
  ]

  const inputCls = "flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 border border-border focus-within:border-primary/30 transition-all"
  const inputInnerCls = "flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"

  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 px-2 py-2 -ml-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          返回首页
        </Link>

        <div className="rounded-2xl bg-card p-8 ring-1 ring-foreground/10">
          {/* 标签切换 */}
          <div className="mb-6 flex rounded-xl bg-secondary/60 p-1">
            <button
              onClick={() => { setTab("login"); setError(""); setSuccess("") }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                tab === "login"
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setTab("register"); setError(""); setSuccess("") }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                tab === "register"
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              注册
            </button>
          </div>

          <div className="mb-4">
            <h1 className="text-xl font-bold text-foreground">
              {tab === "login" ? "欢迎回来" : "创建账号"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "login" ? "登录以继续探索" : "加入同人游戏世界"}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400 ring-1 ring-emerald-500/20">
              {success}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className={inputCls}>
                <User className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="用户名或邮箱"
                  required
                  autoComplete="username"
                  className={inputInnerCls}
                  onFocus={(e) => e.target.scrollIntoView({ behavior: "smooth", block: "center" })}
                />
              </div>

              <div className={inputCls}>
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  required
                  autoComplete="current-password"
                  className={inputInnerCls}
                  onFocus={(e) => e.target.scrollIntoView({ behavior: "smooth", block: "center" })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
                {loading ? "登录中…" : "登 录"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              {regFields.map(({ key, icon: Icon, type, placeholder, autoComplete, minLength }) => (
                <div key={key} className={inputCls}>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    type={type}
                    value={regForm[key]}
                    onChange={setReg(key)}
                    placeholder={placeholder}
                    required
                    autoComplete={autoComplete}
                    minLength={minLength}
                    className={inputInnerCls}
                    onFocus={(e) => e.target.scrollIntoView({ behavior: "smooth", block: "center" })}
                  />
                </div>
              ))}

              <TurnstileCaptcha onVerify={handleCaptchaVerify} />

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
                {loading ? "注册中…" : "注 册"}
              </button>
            </form>
          )}

          {tab === "login" && (
            <div className="mt-4 flex justify-center">
              <Link href="/forgot-password" className="inline-flex items-center px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                忘记密码？
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
