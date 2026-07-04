"use client"

import { cn } from "@/lib/utils"
import { Search, Users } from "lucide-react"
import Image from "next/image"
import { Tag } from "@/components/ui/tag"
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
  scenario: "bg-amber-500/15 text-amber-400",
  art: "bg-pink-500/15 text-pink-500",
  chardesign: "bg-violet-500/15 text-violet-500",
  music: "bg-blue-500/15 text-blue-500",
  songs: "bg-emerald-500/15 text-emerald-400",
  director: "bg-indigo-500/15 text-indigo-500",
  other: "bg-muted text-muted-foreground",
}

const ROLES = [
  { key: "all", label: "全部" },
  { key: "scenario", label: "脚本" },
  { key: "art", label: "原画" },
  { key: "chardesign", label: "角色设计" },
  { key: "music", label: "音乐" },
  { key: "songs", label: "主题曲" },
  { key: "director", label: "导演" },
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
    <div className="space-y-6">
      {/* 顶部 */}
      <div>
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">制作组图鉴</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">探索每部作品背后的创作者</p>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="搜索游戏名或创作者名..."
          className="w-full rounded-xl bg-muted pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all"
        />
      </div>

      {/* 角色筛选 */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(r => (
          <button
            key={r.key}
            onClick={() => { setRole(r.key); setPage(1) }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              role === r.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* 统计 */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          共 {total} 个游戏
        </p>
      )}

      {/* 游戏列表 */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-muted h-40" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <Users className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">暂无数据</p>
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
                    <div className="relative h-16 w-28 sm:h-20 sm:w-36 rounded-lg overflow-hidden shrink-0 ring-1 ring-border">
                      <Image
                        src={game.coverImage}
                        alt={game.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-28 sm:h-20 sm:w-36 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-border">
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
                        <Tag variant="badge" className={ROLE_COLORS[c.role] || ROLE_COLORS.other}>
                          {ROLE_LABELS[c.role] || c.role}
                        </Tag>
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
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground disabled:opacity-50 transition-all"
          >
            上一页
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-border hover:bg-accent hover:text-foreground disabled:opacity-50 transition-all"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
