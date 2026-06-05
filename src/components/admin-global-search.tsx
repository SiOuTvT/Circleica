"use client"

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Gamepad2, Loader2, MessageSquare, Search, Tag, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

interface SearchResult {
  type: "game" | "user" | "tag" | "forum"
  id: string
  title: string
  subtitle?: string
}

const TYPE_CONFIG = {
  game:  { label: "游戏", icon: Gamepad2,      href: (id: string) => `/admin/games?edit=${id}` },
  user:  { label: "用户", icon: Users,          href: (id: string) => `/admin/users` },
  tag:   { label: "标签", icon: Tag,            href: (id: string) => `/admin/tags` },
  forum: { label: "论坛", icon: MessageSquare,  href: (id: string) => `/admin/forum` },
} as const

export function AdminGlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        // Only intercept if we're in admin pages
        if (window.location.pathname.startsWith("/admin")) {
          e.preventDefault()
          e.stopPropagation()
          setOpen(prev => !prev)
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown, true)
    return () => document.removeEventListener("keydown", handleKeyDown, true)
  }, [])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); return }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
          setSelectedIndex(0)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  function handleInputChange(value: string) {
    setQuery(value)
    doSearch(value)
  }

  function navigateTo(result: SearchResult) {
    const config = TYPE_CONFIG[result.type]
    router.push(config.href(result.id))
    setOpen(false)
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      navigateTo(results[selectedIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    ;(acc[r.type] ??= []).push(r)
    return acc
  }, {})

  const typeOrder: SearchResult["type"][] = ["game", "user", "tag", "forum"]

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground"
        title="全局搜索 (Ctrl+K)"
      >
        <Search className="h-4 w-4" strokeWidth={2} />
        <span className="hidden sm:inline">搜索…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-lg p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">全局搜索</DialogTitle>
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            {loading ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" strokeWidth={2} />
            ) : (
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索游戏、用户、标签、论坛帖子…"
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
            />
            <kbd className="flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {!query.trim() && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                输入关键词开始搜索…
              </p>
            )}

            {query.trim() && !loading && results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                未找到匹配结果
              </p>
            )}

            {typeOrder.map(type => {
              const items = grouped[type]
              if (!items?.length) return null
              const config = TYPE_CONFIG[type]
              const Icon = config.icon

              return (
                <div key={type} className="mb-2">
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                      {config.label}
                    </span>
                  </div>
                  {items.map(item => {
                    const globalIndex = results.indexOf(item)
                    const isSelected = globalIndex === selectedIndex
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => navigateTo(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-accent text-foreground"
                            : "text-foreground hover:bg-accent/60"
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.title}</p>
                          {item.subtitle && (
                            <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-muted px-1 py-0.5 ring-1 ring-border">↑↓</kbd> 导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-muted px-1 py-0.5 ring-1 ring-border">↵</kbd> 打开
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-muted px-1 py-0.5 ring-1 ring-border">Esc</kbd> 关闭
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
