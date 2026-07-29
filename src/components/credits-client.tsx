"use client"

import { cn } from "@/lib/utils"
import { Search, Users, User, LayoutGrid } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/lib/api-client"
import { Tag } from "@/components/ui/tag"

interface MakerSummary {
  name: string
  normalized: string
  gameCount: number
  coverImage: string | null
  creatorCount: number
}

interface CreatorSummary {
  id: string
  name: string
  nameJa: string | null
  avatar: string | null
  gameCount: number
  coverImage: string | null
  roles: string[]
}

interface MakerListResult {
  makers: MakerSummary[]
  total: number
  totalPages: number
  page: number
}

interface CreatorListResult {
  creators: CreatorSummary[]
  total: number
  totalPages: number
  page: number
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

const CREATOR_ROLES = [
  { key: "all", label: "全部" },
  { key: "scenario", label: "脚本" },
  { key: "art", label: "原画" },
  { key: "chardesign", label: "角色设计" },
  { key: "music", label: "音乐" },
  { key: "songs", label: "主题曲" },
  { key: "director", label: "导演" },
]

function SkeletonCard() {
  return <div className="animate-pulse rounded-2xl bg-muted h-44" />
}

function MakerCard({ maker }: { maker: MakerSummary }) {
  return (
    <Link
      href={`/credits/studio/${encodeURIComponent(maker.normalized)}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-sm"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {maker.coverImage ? (
          <Image
            src={maker.coverImage}
            alt={maker.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="text-2xl font-bold text-primary/30">{maker.name.slice(0, 1)}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/55 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="truncate font-heading text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          {maker.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums text-foreground/80">{maker.gameCount}</span>
          <span>部作品</span>
          {maker.creatorCount > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
              <span className="tabular-nums text-foreground/80">{maker.creatorCount}</span>
              <span>位创作者</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}

function CreatorCard({ creator }: { creator: CreatorSummary }) {
  const display = creator.nameJa || creator.name
  return (
    <Link
      href={`/creators/${creator.id}`}
      className="group flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-0.5 hover:ring-foreground/10 hover:shadow-sm"
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/50">
        {creator.avatar ? (
          <Image
            src={creator.avatar}
            alt={display}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
            sizes="48px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
            <span className="text-sm font-bold text-primary/40">{display.slice(0, 1)}</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm font-medium text-foreground transition-colors group-hover:text-primary">
          {display}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {creator.roles.slice(0, 2).map((r) => (
            <Tag key={r} className="px-1.5 py-0 text-[10px] leading-4">
              {ROLE_LABELS[r] || r}
            </Tag>
          ))}
          <span className="text-xs text-muted-foreground">· {creator.gameCount} 部</span>
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20">
      <div className="text-muted-foreground/20">{icon}</div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-3 pt-6">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        上一页
      </button>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <span className="tabular-nums text-foreground/90">{page}</span>
        <span>/</span>
        <span className="tabular-nums">{totalPages}</span>
      </div>
      <button
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground ring-1 ring-border/50 transition-all hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        下一页
      </button>
    </div>
  )
}

export function CreditsClient() {
  const [tab, setTab] = useState<"studios" | "creators">("studios")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  // 制作组 Tab 状态
  const [studios, setStudios] = useState<MakerSummary[]>([])
  const [studioTotal, setStudioTotal] = useState(0)
  const [studioTotalPages, setStudioTotalPages] = useState(1)
  const [studioPage, setStudioPage] = useState(1)
  const [studioSort, setStudioSort] = useState<"count" | "name">("count")

  // 创作者 Tab 状态
  const [creators, setCreators] = useState<CreatorSummary[]>([])
  const [creatorTotal, setCreatorTotal] = useState(0)
  const [creatorTotalPages, setCreatorTotalPages] = useState(1)
  const [creatorPage, setCreatorPage] = useState(1)
  const [creatorRole, setCreatorRole] = useState("all")

  const [loading, setLoading] = useState(false)
  const reqId = useRef(0)

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setStudioPage(1)
      setCreatorPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // 切换 Tab / 搜索 / 排序 / 分页时重置对应页
  const fetchStudios = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(studioPage), sort: studioSort })
      if (search) params.set("search", search)
      const res = await api.get<{ data?: MakerListResult } & MakerListResult>(`/api/credits/studios?${params}`)
      if (id !== reqId.current) return
      const d = (res.data ?? res) as MakerListResult
      setStudios(d.makers || [])
      setStudioTotal(d.total || 0)
      setStudioTotalPages(d.totalPages || 1)
    } catch {
      if (id === reqId.current) setStudios([])
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [studioPage, studioSort, search])

  const fetchCreators = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(creatorPage) })
      if (creatorRole !== "all") params.set("role", creatorRole)
      if (search) params.set("search", search)
      const res = await api.get<{ data?: CreatorListResult } & CreatorListResult>(`/api/credits?${params}`)
      if (id !== reqId.current) return
      const d = (res.data ?? res) as CreatorListResult
      setCreators(d.creators || [])
      setCreatorTotal(d.total || 0)
      setCreatorTotalPages(d.totalPages || 1)
    } catch {
      if (id === reqId.current) setCreators([])
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [creatorPage, creatorRole, search])

  useEffect(() => {
    if (tab === "studios") fetchStudios()
    else fetchCreators()
  }, [tab, fetchStudios, fetchCreators])

  return (
    <div className="space-y-6">
      {/* ── 页头 ── */}
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Users className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">制作组图鉴</h1>
          <p className="text-sm text-muted-foreground">同人社团 · 小型制作组 · 个人作者</p>
        </div>
      </header>

      {/* ── 双 Tab ── */}
      <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1 ring-1 ring-border w-fit">
        <button
          onClick={() => setTab("studios")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
            tab === "studios" ? "bg-card text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />
          制作组
        </button>
        <button
          onClick={() => setTab("creators")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
            tab === "creators" ? "bg-card text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <User className="h-4 w-4" strokeWidth={1.5} />
          创作者
        </button>
      </div>

      {/* ── 搜索框 ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={tab === "studios" ? "搜索制作组名称..." : "搜索创作者名称..."}
          className="w-full rounded-xl bg-muted/50 pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 ring-1 ring-border outline-none transition-all focus:ring-primary/30 focus:bg-card"
        />
      </div>

      {/* ── 制作组 Tab ── */}
      {tab === "studios" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {!loading && (
              <p className="text-xs text-muted-foreground/70">
                共 <span className="tabular-nums text-foreground">{studioTotal}</span> 个制作组
              </p>
            )}
            <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5 ring-1 ring-border text-xs">
              <button
                onClick={() => { setStudioSort("count"); setStudioPage(1) }}
                className={cn("rounded-md px-2.5 py-1 transition-all", studioSort === "count" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                作品数
              </button>
              <button
                onClick={() => { setStudioSort("name"); setStudioPage(1) }}
                className={cn("rounded-md px-2.5 py-1 transition-all", studioSort === "name" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                名称
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : studios.length === 0 ? (
            <EmptyState icon={<LayoutGrid className="h-12 w-12" strokeWidth={1} />} text={search ? "没有匹配的制作组" : "暂无收录的制作组"} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {studios.map((m) => <MakerCard key={m.normalized} maker={m} />)}
            </div>
          )}

          <Pager page={studioPage} totalPages={studioTotalPages} onPage={setStudioPage} />
        </div>
      )}

      {/* ── 创作者 Tab ── */}
      {tab === "creators" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {CREATOR_ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => { setCreatorRole(r.key); setCreatorPage(1) }}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
                  creatorRole === r.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {!loading && (
            <p className="text-xs text-muted-foreground/70">
              共 <span className="tabular-nums text-foreground">{creatorTotal}</span> 位创作者
            </p>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : creators.length === 0 ? (
            <EmptyState icon={<User className="h-12 w-12" strokeWidth={1} />} text={search ? "没有匹配的创作者" : "暂无创作者数据"} />
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {creators.map((c) => <CreatorCard key={c.id} creator={c} />)}
            </div>
          )}

          <Pager page={creatorPage} totalPages={creatorTotalPages} onPage={setCreatorPage} />
        </div>
      )}
    </div>
  )
}
