"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Search } from "lucide-react"

/**
 * 页头搜索框：输入经 300ms 防抖后写入 URL ?q=，由服务端按 q 过滤列表。
 * 用于精选合集 / 标签浏览等 Server Component 页头，保证「介绍文案下方直接衔接搜索框」且功能可用。
 */
export function HeaderSearch({ q, placeholder }: { q?: string; placeholder: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = useState(q ?? "")

  useEffect(() => {
    setValue(q ?? "")
  }, [q])

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const current = params.get("q") ?? ""
      if (value === current) return
      if (value) params.set("q", value)
      else params.delete("q")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }, 300)
    return () => clearTimeout(t)
  }, [value, pathname, router])

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border-2 border-input bg-transparent py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
      />
    </div>
  )
}
