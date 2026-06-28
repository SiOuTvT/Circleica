"use client"

import { Home, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="relative">
        <div className="text-8xl font-bold text-muted-foreground/30 select-none">!</div>
      </div>
      <h1 className="text-2xl font-semibold text-foreground">出了点问题</h1>
      <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
        页面遇到了一个意外错误。<br />
        别担心，可以尝试刷新或返回首页。
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground bg-primary transition-all hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" /> 重新尝试
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-muted-foreground border border-border transition-colors hover:bg-muted hover:text-foreground"
        >
          <Home className="h-4 w-4" /> 返回首页
        </Link>
      </div>
    </div>
  )
}
