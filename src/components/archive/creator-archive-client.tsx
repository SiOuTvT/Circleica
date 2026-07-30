"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { parseApiResponse } from "@/lib/api-handler"
import { ArchiveShell } from "./archive-shell"
import { ArchiveHero } from "./archive-hero"
import { EntityCard } from "./entity-card"
import { AZIndex } from "./az-index"
import { ArchivePlaceholder } from "./archive-placeholder"
import { computeDensity, groupByFirstChar, DENSITY_GRID } from "./density"
import type { CreatorSummary, CreatorListResult } from "@/lib/creators"

const PAGE_SIZE = 1000
const ANCHOR_PREFIX = "archive-letter-"

/**
 * Creator Archive 列表（M2 落地页面）
 *
 * 与 Studio Archive 同构，验证点一致：
 *  - density 三态：compact(1~3) / standard(4~11) / dense(≥12) 驱动网格列数
 *  - ArchivePlaceholder 三态：loading / empty / error
 *  - AZIndex 稀疏自动隐藏（可用首字 < 2 时隐藏）+ scroll-spy 高亮当前分区
 *  - 不同数据量下布局稳定（空不崩 / 少不空 / 多不乱）
 */
export function CreatorArchiveClient() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"count" | "name">("name")
  const [creators, setCreators] = useState<CreatorSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeLetter, setActiveLetter] = useState<string | undefined>(undefined)
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
      const res = await api.get<{ data: CreatorListResult }>(`/api/creators?${params}`)
      if (id !== reqId.current) return
      const d = parseApiResponse<CreatorListResult>(res)
      setCreators(d.creators || [])
      setTotal(d.total || 0)
    } catch {
      if (id === reqId.current) {
        setCreators([])
        setError(true)
      }
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [sort, search])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const groupName = (c: CreatorSummary) => c.nameJa || c.name
  const groups = groupByFirstChar(creators, groupName)
  const density = computeDensity(creators.length)
  const availableLetters = groups.map((g) => g.key)
  const truncated = !loading && !error && creators.length > 0 && total > creators.length

  // scroll-spy：高亮当前可见首字分区
  useEffect(() => {
    if (loading || error || creators.length === 0) return
    const grps = groupByFirstChar(creators, groupName)
    const els = grps
      .map((g) => document.getElementById(`${ANCHOR_PREFIX}${encodeURIComponent(g.key)}`))
      .filter((el): el is HTMLElement => el !== null)
    if (els.length === 0) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const raw = visible[0].target.id.slice(ANCHOR_PREFIX.length)
        setActiveLetter(decodeURIComponent(raw))
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [loading, error, creators, search, sort])

  return (
    <ArchiveShell
      entity="creator"
      density={density}
      breadcrumb={
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/creators"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-foreground/80 transition-colors hover:text-primary"
          >
            <Users className="h-4 w-4" strokeWidth={2} />
            创作者图鉴
          </Link>
        </nav>
      }
      header={
        <ArchiveHero
          variant="person"
          eyebrow="creators"
          title="创作者图鉴"
          lede="脚本 · 原画 · 音乐 · 导演。按名称首字浏览全部创作者档案与参与作品。"
          meta={
            search ? (
              <span>
                匹配 <span className="tabular-nums text-foreground">{total}</span> 位创作者
              </span>
            ) : (
              <span>
                共 <span className="tabular-nums text-foreground">{total}</span> 位创作者
              </span>
            )
          }
          search={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-md flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="搜索创作者名称..."
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
        />
      }
      index={!loading && !error ? <AZIndex available={availableLetters} active={activeLetter} anchorPrefix={ANCHOR_PREFIX} /> : undefined}
    >
      {truncated && (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          当前展示前 {creators.length} 位创作者（共 {total} 位），完整索引仍在完善。
        </p>
      )}
      {loading ? (
        <ArchivePlaceholder state="loading" entity="creator" loadingCount={density === "dense" ? 12 : 8} loadingVariant="creator" />
      ) : error ? (
        <ArchivePlaceholder state="error" entity="creator" retryHref="/creators" />
      ) : creators.length === 0 ? (
        <ArchivePlaceholder
          state="empty"
          entity="creator"
          message={search ? "没有匹配的创作者" : "暂无收录的创作者"}
        />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key} id={`${ANCHOR_PREFIX}${encodeURIComponent(g.key)}`} className="scroll-mt-20">
              <h2 className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
                <span className="font-heading text-base text-foreground">{g.key === "#" ? "#" : g.key}</span>
                <span className="h-px flex-1 bg-border/60" />
                <span className="tabular-nums text-xs text-muted-foreground/60">{g.items.length}</span>
              </h2>
              <div className={cn("grid gap-3", DENSITY_GRID[density])}>
                {g.items.map((c) => (
                  <EntityCard
                    key={c.id}
                    variant="creator"
                    data={{
                      id: c.id,
                      name: c.name,
                      nameJa: c.nameJa,
                      avatar: c.avatar,
                      roles: c.roles,
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
