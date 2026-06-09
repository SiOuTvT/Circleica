"use client"

import { cn } from "@/lib/utils"
import { Search, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"

interface Creator {
  id: string
  name: string
  nameJa: string | null
  avatar: string | null
  role: string
}

interface CreditGame {
  id: string
  serialId: number
  title: string
  coverImage: string
  createdAt: string
  creators: Creator[]
}

const ROLE_LABELS: Record<string, string> = {
  scenario: "脚本",
  art: "原画",
  chardesign: "角色设计",
  music: "音乐",
  songs: "主题曲",
  director: "导演",
  other: "其他",
}

const ROLE_COLORS: Record<string, string> = {
  scenario: "bg-amber-500/15 text-amber-500 border-amber-500/20",
  art: "bg-pink-500/15 text-pink-500 border-pink-500/20",
  chardesign: "bg-violet-500/15 text-violet-500 border-violet-500/20",
  music: "bg-blue-500/15 text-blue-500 border-blue-500/20",
  songs: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
  director: "bg-indigo-500/15 text-indigo-500 border-indigo-500/20",
  other: "bg-muted text-muted-foreground border-border",
}

const ROLES = [
  { key: "all", label: "全部", icon: "✦" },
  { key: "scenario", label: "脚本", icon: "📝" },
  { key: "art", label: "原画", icon: "🎨" },
  { key: "chardesign", label: "角色设计", icon: "👤" },
  { key: "music", label: "音乐", icon: "🎵" },
  { key: "songs", label: "主题曲", icon: "🎤" },
  { key: "director", label: "导演", icon: "🎬" },
]

export function CreditsClient() {
  const [games, setGames] = useState<CreditGame[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [role, setRole] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchGames = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (role !== "all") params.set("role", role)
      if (search) params.set("search", search)

      const res = await fetch(`/api/credits?${params}`)
      const data = await res.json()
      setGames(data.games || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch {
      setGames([])
    } finally {
      setLoading(false)
    }
  }, [page, role, search])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  // 搜索防抖
  const [searchInput, setSearchInput] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  return (
    <div className="min-h-screen">
      {/* Hero 区域 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-primary/10 p-6 sm:p-8 mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">制作组图鉴</h1>
              <p className="text-sm text-muted-foreground">探索每部作品背后的创作者</p>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="mt-6 relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="搜索游戏名或创作者名..."
              className="w-full rounded-xl bg-background/80 backdrop-blur-sm pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 focus:bg-background transition-all"
            />
          </div>
        </div>
      </div>

      {/* 角色筛选 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ROLES.map(r => (
          <button
            key={r.key}
            onClick={() => { setRole(r.key); setPage(1) }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200 border",
              role === r.key
                ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground hover:bg-accent"
            )}
          >
            <span className="text-[13px]">{r.icon}</span>
            <span>{r.label}</span>
          </button>
        ))}
      </div>

      {/* 统计 */}
      {!loading && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">共</span>
          <span className="text-sm font-semibold text-primary">{total}</span>
          <span className="text-xs text-muted-foreground">个游戏</span>
        </div>
      )}

      {/* 游戏列表 */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-card ring-1 ring-border h-48" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">暂无数据</p>
            <p className="text-xs text-muted-foreground mt-1">还没有游戏关联创作者</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {games.map(game => (
            <div
              key={game.id}
              className="group rounded-2xl bg-card ring-1 ring-border overflow-hidden transition-all duration-300 hover:ring-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* 游戏信息 */}
              <div className="p-4 sm:p-5">
                <Link
                  href={`/games/${game.serialId}`}
                  className="flex items-center gap-4 group/game"
                >
                  {game.coverImage ? (
                    <div className="relative h-16 w-12 sm:h-20 sm:w-14 rounded-xl overflow-hidden shrink-0 ring-1 ring-border">
                      <Image
                        src={game.coverImage}
                        alt={game.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-12 sm:h-20 sm:w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-border">
                      <span className="text-lg text-primary/40">?</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover/game:text-primary transition-colors truncate">
                      {game.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {game.creators.length} 位创作者
                      </span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(game.createdAt).getFullYear()}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>

              {/* 创作者区域 */}
              <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                <div className="flex flex-wrap gap-2">
                  {game.creators.map(c => (
                    <Link
                      key={`${c.id}-${c.role}`}
                      href={`/creators/${c.id}`}
                      className="flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2 ring-1 ring-border transition-all duration-200 hover:bg-accent hover:ring-primary/30 hover:shadow-sm"
                    >
                      {c.avatar ? (
                        <Image
                          src={c.avatar}
                          alt={c.name}
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full object-cover shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {(c.nameJa || c.name)[0]}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate max-w-[100px]">
                          {c.nameJa || c.name}
                        </p>
                        <span className={cn(
                          "inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium border",
                          ROLE_COLORS[c.role] || ROLE_COLORS.other
                        )}>
                          {ROLE_LABELS[c.role] || c.role}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            上一页
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-medium transition-all",
                    page === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  {p}
                </button>
              )
            })}
            {totalPages > 5 && <span className="text-muted-foreground">...</span>}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
