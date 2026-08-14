"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { useEffect } from "react"
import { captureClientError } from "@/lib/client-error"

export default function StudioDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureClientError(error)
  }, [error])

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <AlertTriangle className="h-12 w-12 text-warning/40" strokeWidth={1} />
      <div>
        <p className="text-base font-medium text-foreground">制作组详情加载失败</p>
        <p className="mt-1 text-sm text-muted-foreground">请稍后重试，或返回制作组图鉴。</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground"
        >
          重试
        </button>
        <Link
          href="/credits/studio"
          className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground"
        >
          制作组图鉴
        </Link>
      </div>
    </div>
  )
}
