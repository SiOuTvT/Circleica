"use client"

import { cn } from "@/lib/utils"
import { Search, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api-client"

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

      const result = await api.get<{ data?: { games?: CreditGame[]; totalPages?: number; total?: number }; games?: CreditGame[]; totalPages?: number; total?: number }>(`/api/credits?${params}`)
      const data = result.data || result
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
    <div className="space-y-8">
      {/* ── 页头 ── */}
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Users className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">制作组图鉴</h1>
          <p className="text-sm text-muted-foreground">探索每部作品背后的创作者</p>
        </div>
      </header>

      {/* ── 搜索框 ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="搜索游戏名或创作者名..."
          className="w-full rounded-xl bg-muted/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-border outline-none transition-all focus:ring-primary/30 focus:bg-card"
        />
      </div>

      {/* ── 角色筛选 ── */}
      <div className="flex flex-wrap gap-2">
        {ROLES.map(r => (
          <button
            key={r.key}
            onClick={() => { setRole(r.key); setPage(1) }}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
              role === r.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ── 统计 ── */}
      {!loading && (
        <p className="text-xs text-muted-foreground/70">
          共 <span className="tabular-nums text-foreground">{total}</span> 个作品
        </p>
      )}

      {/* ── 游戏列表 ── */}
      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-muted h-36" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Users className="h-12 w-12 text-muted-foreground/20" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">暂无数据</p>
        </div>
      ) : (
        <div className="space-y-5">
          {games.map(game => (
            <div
              key={game.id}
              className="group flex gap-5 rounded-2xl bg-card p-5 ring-1 ring-border/50 transition-all duration-300 hover:ring-foreground/10 hover:shadow-sm"
            >
              {/* ── 封皮区 ── */}
              <Link
                href={`/games/${game.serialId}`}
                className="relative w-24 shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-muted ring-1 ring-border/50 transition-all duration-300 group-hover:ring-foreground/10 group-hover:shadow-md sm:w-28 lg:w-[130px]"
              >
                {game.coverImage ? (
                  <Image
                    src={game.coverImage}
                    alt={game.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    unoptimized
                    sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 130px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <span className="text-lg font-bold text-primary/30">?</span>
                  </div>
                )}
              </Link>

              {/* ── 信息区 ── */}
              <div className="flex flex-col min-w-0 flex-1">
                {/* 标题 */}
                <Link
                  href={`/games/${game.serialId}`}
                  className="group/title"
                >
                  <h3 className="text-base font-heading font-semibold text-foreground leading-snug transition-colors group-hover/title:text-primary sm:text-lg">
                    {game.title}
                  </h3>
                </Link>

                {/* 分隔线 */}
                {game.creators.length > 0 && (
                  <div className="mt-3 mb-3 h-px bg-border/40" />
                )}

                {/* 创作者列 */}
                <div className="space-y-1.5">
                  {game.creators.map(c => (
                    <Link
                      key={`${c.id}-${c.role}`}
                      href={`/creators/${c.id}`}
                      className="group/creator inline-flex items-baseline gap-2 text-sm transition-colors hover:opacity-80"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wider text-primary/70">
                        {ROLE_LABELS[c.role] || c.role}
                      </span>
                      <span className="truncate text-foreground/90 group-hover/creator:text-foreground transition-colors">
                        {c.nameJa || c.name}
                      </span>
                    </Link>
                  ))}
                </div>

                {/* 底部元信息 */}
                <div className="mt-auto flex items-center gap-2 pt-4">
                  <span className="text-xs tabular-nums text-muted-foreground/60">
                    {new Date(game.createdAt).getFullYear()}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                  <span className="text-xs text-muted-foreground/60">
                    {game.creators.length} 位创作者
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 分页 ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 hover:bg-accent hover:text-foreground disabled:opacity-40 transition-all"
          >
            上一页
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <span className="tabular-nums text-foreground/90">{page}</span>
            <span>/</span>
            <span className="tabular-nums">{totalPages}</span>
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 hover:bg-accent hover:text-foreground disabled:opacity-40 transition-all"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
