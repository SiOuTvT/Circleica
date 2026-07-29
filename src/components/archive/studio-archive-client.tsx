"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { ArchiveShell } from "./archive-shell"
import { ArchiveHero } from "./archive-hero"
import { EntityCard } from "./entity-card"
import { AZIndex } from "./az-index"
import { ArchivePlaceholder } from "./archive-placeholder"
import { computeDensity, groupByFirstChar } from "./density"

interface MakerSummary {
  name: string
  normalized: string
  gameCount: number
  coverImage: string | null
  creatorCount: number
}
interface MakerListResult {
  makers: MakerSummary[]
  total: number
  totalPages: number
  page: number
}

const PAGE_SIZE = 1000
const ANCHOR_PREFIX = "archive-letter-"

const gridByDensity = {
  compact: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  standard: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  dense: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
} as const

/**
 * Studio Archive 列表（M1 首个落地页面）
 *
 * 验证点：
 *  - density 三态：compact(1~3) / standard(4~11) / dense(≥12) 驱动网格列数
 *  - ArchivePlaceholder 三态：loading / empty / error
 *  - AZIndex 稀疏自动隐藏（可用首字 < 2 时隐藏）
 *  - 不同数据量下布局稳定（空不崩 / 少不空 / 多不乱）
 */
export function StudioArchiveClient() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"count" | "name">("name")
  const [makers, setMakers] = useState<MakerSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const reqId = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchAll = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams({ sort, pageSize: String(PAGE_SIZE) })
      if (search) params.set("search", search)
      const res = await api.get<{ data?: MakerListResult } & MakerListResult>(`/api/credits/studios?${params}`)
      if (id !== reqId.current) return
      const d = (res.data ?? res) as MakerListResult
      setMakers(d.makers || [])
      setTotal(d.total || 0)
    } catch {
      if (id === reqId.current) {
        setMakers([])
        setError(true)
      }
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [sort, search])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const groups = groupByFirstChar(makers, (m) => m.name)
  const density = computeDensity(makers.length)
  const availableLetters = groups.map((g) => g.key)

  return (
    <ArchiveShell
      entity="studio"
      density={density}
      breadcrumb={
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/credits"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-foreground/80 transition-colors hover:text-primary"
          >
            <Users className="h-4 w-4" strokeWidth={2} />
            制作组图鉴
          </Link>
        </nav>
      }
      header={
        <ArchiveHero
          variant="org"
          eyebrow="Archive"
          title="制作组图鉴"
          lede="同人社团 · 小型制作组 · 个人作者。按名称首字浏览全部制作组档案。"
          meta={
            <span>
              共 <span className="tabular-nums text-foreground">{total}</span> 个制作组
            </span>
          }
        />
      }
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索制作组名称..."
              className="w-full rounded-xl bg-muted/50 py-2.5 pl-10 pr-4 text-sm text-foreground outline-none ring-1 ring-border transition-all placeholder:text-muted-foreground/60 focus:bg-card focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5 text-xs ring-1 ring-border">
            <button
              onClick={() => setSort("count")}
              className={cn(
                "rounded-md px-2.5 py-1 transition-all",
                sort === "count" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              作品数
            </button>
            <button
              onClick={() => setSort("name")}
              className={cn(
                "rounded-md px-2.5 py-1 transition-all",
                sort === "name" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              名称
            </button>
          </div>
        </div>
      }
      index={!loading && !error ? <AZIndex available={availableLetters} anchorPrefix={ANCHOR_PREFIX} /> : undefined}
    >
      {loading ? (
        <ArchivePlaceholder state="loading" entity="studio" loadingCount={density === "dense" ? 12 : 8} />
      ) : error ? (
        <ArchivePlaceholder state="error" entity="studio" retryHref="/credits/studio" />
      ) : makers.length === 0 ? (
        <ArchivePlaceholder
          state="empty"
          entity="studio"
          message={search ? "没有匹配的制作组" : "暂无收录的制作组"}
        />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section
              key={g.key}
              id={`${ANCHOR_PREFIX}${encodeURIComponent(g.key)}`}
              className="scroll-mt-20"
            >
              <h2 className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                <span className="font-heading text-base text-foreground">{g.key === "#" ? "#" : g.key}</span>
                <span className="h-px flex-1 bg-border/60" />
                <span className="tabular-nums text-xs text-muted-foreground/60">{g.items.length}</span>
              </h2>
              <div className={cn("grid gap-3", gridByDensity[density])}>
                {g.items.map((m) => (
                  <EntityCard
                    key={m.normalized}
                    variant="studio"
                    data={{
                      name: m.name,
                      normalized: m.normalized,
                      gameCount: m.gameCount,
                      coverImage: m.coverImage,
                      creatorCount: m.creatorCount,
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </ArchiveShell>
  )
}
