"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { parseApiResponse } from "@/lib/api-handler"
import { ArchiveShell } from "./archive-shell"
import { EntityCard } from "./entity-card"
import { AZIndex } from "./az-index"
import { ArchivePlaceholder } from "./archive-placeholder"
import { groupByFirstChar, DENSITY_GRID } from "./density"
import type { ArchiveDensity, ArchiveState } from "./density"
import type { MakerSummary, MakerListResult } from "@/lib/makers"

const PAGE_SIZE = 1000
const ANCHOR_PREFIX = "archive-letter-"

/**
 * Studio Archive 列表（M1 首个落地页面，列表交互层）。
 *
 * 页头(header)由 Server Component 在 page.tsx 渲染后作为 prop 传入，本组件不再渲染 ArchiveHero，
 * 仅负责：基于 q / sort 走 URL 驱动的 fetch、网格渲染、AZIndex、scroll-spy、三态占位。
 */
export function StudioArchiveClient({
  q,
  sort,
  total,
  density,
  state,
  header,
}: {
  q: string
  sort: "count" | "name"
  total: number
  density: ArchiveDensity
  state?: ArchiveState
  header: ReactNode
}) {
  const [makers, setMakers] = useState<MakerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeLetter, setActiveLetter] = useState<string | undefined>(undefined)
  const reqId = useRef(0)

  const fetchAll = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams({ sort, pageSize: String(PAGE_SIZE) })
      if (q) params.set("search", q)
      const res = await api.get<{ data: MakerListResult }>(`/api/credits/studios?${params}`)
      if (id !== reqId.current) return
      const d = parseApiResponse<MakerListResult>(res)
      setMakers(d.makers || [])
    } catch {
      if (id === reqId.current) {
        setMakers([])
        setError(true)
      }
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [sort, q])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const groups = groupByFirstChar(makers, (m) => m.name)
  const availableLetters = groups.map((g) => g.key)
  const truncated = !loading && !error && makers.length > 0 && total > makers.length

  // scroll-spy：高亮当前可见首字分区
  useEffect(() => {
    if (loading || error || makers.length === 0) return
    const grps = groupByFirstChar(makers, (m) => m.name)
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
  }, [loading, error, makers, q, sort])

  return (
    <ArchiveShell
      entity="studio"
      density={density}
      state={state}
      header={header}
      index={!loading && !error ? <AZIndex available={availableLetters} active={activeLetter} anchorPrefix={ANCHOR_PREFIX} /> : undefined}
    >
      {truncated && (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          当前展示前 {makers.length} 个制作组（共 {total} 个），完整索引仍在完善。
        </p>
      )}
      {loading ? (
        <ArchivePlaceholder state="loading" entity="studio" loadingCount={density === "dense" ? 12 : 8} />
      ) : error ? (
        <ArchivePlaceholder state="error" entity="studio" retryHref="/credits/studio" />
      ) : makers.length === 0 ? (
        <ArchivePlaceholder
          state="empty"
          entity="studio"
          message={q ? "没有匹配的制作组" : "暂无收录的制作组"}
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
                {g.items.map((m) => (
                  <EntityCard
                    key={m.normalized}
                    variant="studio"
                    data={{
                      slug: m.slug,
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
