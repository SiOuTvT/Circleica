"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export function AdminBackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={2} />
      返回
    </button>
  )
}
