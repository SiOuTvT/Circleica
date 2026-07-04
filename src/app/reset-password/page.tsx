"use client"

import { CheckCircle2, Eye, EyeOff, Loader2, Lock, XCircle } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

function ResetForm() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const token         = searchParams.get("token") ?? ""

  const [status, setStatus]     = useState<"loading" | "valid" | "invalid">("loading")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm]   = useState("")
  const [showPwd, setShowPwd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState("")

  useEffect(() => {
    if (!token) { setStatus("invalid"); return }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => { if (d.valid) { setStatus("valid"); setEmail(d.email) } else setStatus("invalid") })
      .catch(() => setStatus("invalid"))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password !== confirm) { setError("两次密码不一致"); return }
    if (password.length < 6) { setError("密码至少6位"); return }
    setSaving(true)
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error); return }
    setDone(true)
    setTimeout(() => router.push("/login"), 2000)
  }

  const fieldCls = "flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 ring-1 ring-border focus-within:ring-primary/30 transition-all"

  return (
    <div className="rounded-2xl bg-card p-8 ring-1 ring-foreground/10">
      {status === "loading" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">验证链接中…</p>
        </div>
      )}
      {status === "invalid" && (
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" strokeWidth={1.5} />
          <h1 className="text-lg font-bold text-foreground">链接过期啦</h1>
          <p className="mt-2 text-sm text-muted-foreground">重新申请一个吧~</p>
          <Link href="/forgot-password" className="mt-6 block text-sm text-primary hover:text-primary/80 transition-colors">重新申请</Link>
        </div>
      )}
      {status === "valid" && !done && (
        <>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">重置密码</h1>
            <p className="mt-1 text-sm text-muted-foreground">{email}</p>
          </div>
          {error && <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className={fieldCls}>
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <input type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="新密码（至少6位）" aria-label="新密码" required className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
              </button>
            </div>
            <div className={fieldCls}>
              <Lock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <input type={showPwd ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="确认新密码" aria-label="确认新密码" required className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
            </div>
            <button type="submit" disabled={saving}
              className="gradient-accent flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
              {saving ? "重置中…" : "确认重置"}
            </button>
          </form>
        </>
      )}
      {done && (
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" strokeWidth={1.5} />
          <h1 className="text-lg font-bold text-foreground">密码重置成功！</h1>
          <p className="mt-2 text-sm text-muted-foreground">正在跳转到登录页…</p>
        </div>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="rounded-2xl bg-card p-8 ring-1 ring-foreground/10"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.5} /></div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
