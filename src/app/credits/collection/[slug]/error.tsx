"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export default function CuratedCollectionDetailError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <AlertTriangle className="h-12 w-12 text-warning/40" strokeWidth={1} />
      <div>
        <p className="text-base font-medium text-foreground">合集详情加载失败</p>
        <p className="mt-1 text-sm text-muted-foreground">请稍后重试，或返回精选合集。</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground"
        >
          重试
        </button>
        <Link
          href="/credits/collection"
          className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground"
        >
          精选合集
        </Link>
      </div>
    </div>
  )
}
