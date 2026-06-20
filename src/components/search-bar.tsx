"use client"

import { Search, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

type Suggestion = {
  id: string
  serialId: number
  title: string
  coverImage: string | null
  originalWork: string | null
}

// 根据输入长度动态调整 debounce 时间
// 短词 (1-2 字): 200ms, 中等长度 (3-5 字): 300ms, 长词 (6 字以上): 400ms
function getDebounceDelay(q: string): number {
  const len = q.trim().length
  if (len <= 2) return 200
  if (len <= 5) return 300
  return 400
}

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort()
    if (!q) { setSuggestions([]); setShowSuggestions(false); return }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      if (!controller.signal.aborted && res.ok) {
        const data = await res.json()
        setSuggestions(data)
        setShowSuggestions(data.length > 0)
        setActiveIdx(-1)
      }
    } catch { /* aborted or network error */ }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // 空输入立即清除，非空根据长度动态延迟
    if (!v.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
    } else {
      const delay = getDebounceDelay(v)
      debounceRef.current = setTimeout(() => fetchSuggestions(v.trim()), delay)
    }
  }

  // 立即发送当前建议请求（用户按回车时）
  const fetchSuggestionsImmediately = useCallback(() => {
    const q = value.trim()
    if (!q) return
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setSuggestions(data)
        setShowSuggestions(data.length > 0)
      })
      .catch(() => {})
  }, [value])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // 用户按回车时立即发送建议请求，然后跳转
    fetchSuggestionsImmediately()
    setShowSuggestions(false)
    const q = value.trim()
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx(prev => Math.max(prev - 1, -1))
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault()
      setShowSuggestions(false)
      router.push(`/games/${suggestions[activeIdx].serialId}`)
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 ring-1 ring-border transition-all focus-within:ring-primary/40">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          <input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="搜索游戏名称、原作、标签…"
            inputMode="search"
            enterKeyHint="search"
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => { setValue(""); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus() }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          )}
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            搜索
          </button>
        </div>
      </form>

      {/* 搜索建议下拉 */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl bg-card py-1 shadow-lg ring-1 ring-border"
        >
          {suggestions.map((s, i) => (
            <Link
              key={s.id}
              href={`/games/${s.serialId}`}
              onClick={() => setShowSuggestions(false)}
              className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary ${i === activeIdx ? "bg-secondary" : ""}`}
            >
              {s.coverImage ? (
                <Image
                  src={s.coverImage}
                  alt={s.title}
                  width={32}
                  height={44}
                  className="h-11 w-8 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="h-11 w-8 rounded-md bg-secondary shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                {s.originalWork && (
                  <p className="text-xs text-muted-foreground truncate">{s.originalWork}</p>
                )}
              </div>
            </Link>
          ))}
          <div className="border-t px-4 py-2.5" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={handleSubmit}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              查看全部「{value.trim()}」的搜索结果 →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}