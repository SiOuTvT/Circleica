"use client"

import { ArrowLeft, CheckCircle2, Loader2, Lock, Mail, User } from "lucide-react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"login" | "register">("login")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // 登录表单
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")

  // 注册表单
  const [regForm, setRegForm] = useState({ username: "", email: "", password: "", confirm: "" })

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
      router.push("/")
      router.refresh()
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (regForm.password !== regForm.confirm) { setError("两次密码不一致"); return }
    if (regForm.password.length < 6) { setError("密码至少6位"); return }
    setLoading(true)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: regForm.username, email: regForm.email, password: regForm.password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    // 注册成功后自动切换到登录
    setTab("login")
    setError("")
    setIdentifier(regForm.username)
    setPassword("")
  }

  const regFields = [
    { key: "username" as const, icon: User, type: "text", placeholder: "用户名" },
    { key: "email" as const, icon: Mail, type: "email", placeholder: "邮箱地址" },
    { key: "password" as const, icon: Lock, type: "password", placeholder: "密码（至少6位）" },
    { key: "confirm" as const, icon: CheckCircle2, type: "password", placeholder: "确认密码" },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          返回首页
        </Link>

        <div className="rounded-2xl bg-zinc-900 light:bg-white p-8 ring-1 ring-white/[0.06] light:ring-black/[0.06]">
          {/* 标签切换 */}
          <div className="mb-6 flex rounded-xl bg-zinc-800/60 p-1">
            <button
              onClick={() => { setTab("login"); setError("") }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                tab === "login"
                  ? "bg-zinc-700 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setTab("register"); setError("") }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                tab === "register"
                  ? "bg-zinc-700 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-400"
              }`}
            >
              注册
            </button>
          </div>

          <div className="mb-4">
            <h1 className="text-xl font-bold text-zinc-100">
              {tab === "login" ? "欢迎回来" : "创建账号"}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {tab === "login" ? "登录以继续探索" : "加入同人游戏世界"}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-zinc-800 px-4 py-3 ring-1 ring-white/[0.06] focus-within:ring-zinc-600 transition-all">
                <User className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="用户名或邮箱"
                  required
                  autoComplete="off"
                  className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-zinc-800 px-4 py-3 ring-1 ring-white/[0.06] focus-within:ring-zinc-600 transition-all">
                <Lock className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  required
                  className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-900 transition-all hover:bg-white disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
                {loading ? "登录中…" : "登 录"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              {regFields.map(({ key, icon: Icon, type, placeholder }) => (
                <div key={key} className="flex items-center gap-3 rounded-xl bg-zinc-800 px-4 py-3 ring-1 ring-white/[0.06] focus-within:ring-zinc-600 transition-all">
                  <Icon className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
                  <input
                    type={type}
                    value={regForm[key]}
                    onChange={setReg(key)}
                    placeholder={placeholder}
                    required
                    autoComplete="off"
                    className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
                  />
                </div>
              ))}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 py-3 text-sm font-semibold text-zinc-900 transition-all hover:bg-white disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
                {loading ? "注册中…" : "注 册"}
              </button>
            </form>
          )}

          {tab === "login" && (
            <p className="mt-4 text-center text-sm">
              <Link href="/forgot-password" className="text-zinc-600 transition-colors hover:text-zinc-400">
                忘记密码？
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}