"use client"

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function ReportSearchForm({ initialQ }: { initialQ: string }) {
  const router = useRouter()
  const [q, setQ] = useState(initialQ)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    params.set("page", "1")
    router.push(`/admin/reports?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="搜索游戏名称…"
          className="rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring transition-all w-full sm:w-56"
        />
      </div>
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
      >
        搜索
      </button>
    </form>
  )
}
