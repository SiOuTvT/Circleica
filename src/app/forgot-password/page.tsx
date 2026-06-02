"use client"

import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) setSent(true)
    else { const d = await res.json(); setError(d.error) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/login" className="mb-8 flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300 light:hover:text-zinc-600">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          返回登录
        </Link>

        <div className="rounded-2xl bg-card p-8 ring-1 ring-foreground/10">
          {sent ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" strokeWidth={1.5} />
              <h1 className="text-lg font-bold text-zinc-100 light:text-zinc-900">邮件已发出~</h1>
              <p className="mt-2 text-sm text-zinc-500">
                如果这个邮箱注册过，你应该很快就能收到邮件了。
              </p>
              <p className="mt-3 text-xs text-zinc-600 light:text-zinc-400">
                没收到？看看垃圾箱，或者联系我们帮忙~
              </p>
              <Link href="/login" className="mt-6 block text-sm text-primary hover:text-primary/80 transition-colors">
                返回登录
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-zinc-100 light:text-zinc-900">忘记密码</h1>
                <p className="mt-1 text-sm text-zinc-500">输入注册邮箱，我们马上发到你邮箱~</p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-zinc-800 light:bg-zinc-100 px-4 py-3 ring-1 ring-white/[0.06] light:ring-black/[0.06] focus-within:ring-zinc-600 light:focus-within:ring-zinc-400 transition-all">
                  <Mail className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="注册邮箱"
                    required
                    className="flex-1 bg-transparent text-sm text-zinc-200 light:text-zinc-800 placeholder:text-zinc-600 light:placeholder:text-zinc-400 outline-none"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="gradient-accent flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
                  {loading ? "发送中…" : "发送重置链接"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
