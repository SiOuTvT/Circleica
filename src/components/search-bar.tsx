"use client"

import { Search, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search")
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 ring-1 ring-border transition-all focus-within:ring-blue-500/40">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="搜索游戏名称、原作、标签…"
          autoFocus
          className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => { setValue(""); inputRef.current?.focus() }}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        )}
        <button
          type="submit"
          className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium text-white ring-1 ring-blue-500/30 transition-all hover:bg-blue-600"
        >
          搜索
        </button>
      </div>
    </form>
  )
}
