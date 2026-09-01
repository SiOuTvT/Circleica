"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { parseApiResponse } from "@/lib/api-handler-client"
import { ArchiveShell } from "./archive-shell"
import type { ArchiveView } from "./view-tabs"
import { EntityCard } from "./entity-card"
import { StudioWorksCard, StudioWorksCardSkeleton } from "./studio-works-card"
import { AZIndex } from "./az-index"
import { ArchiveLoadMore } from "./load-more"
import { ArchivePlaceholder } from "./archive-placeholder"
import { groupByLatinFirstChar, DENSITY_GRID } from "./density"
import type { ArchiveDensity, ArchiveState } from "./density"
import type { MakerSummary, MakerListResult } from "@/lib/makers"
import type { StudioWorksItem, StudioWorksResult } from "@/lib/credits-works"

/** 首屏 + 每批增量加载的条数（分页由服务端 SQL 完成，避免一次全量拉取大库） */
const PAGE_SIZE = 96
const WORKS_PAGE_SIZE = 24
const ANCHOR_PREFIX = "archive-letter-"

/** 合并卡的稳定 key（一张卡可能包含多个组） */
function studioCardKey(item: StudioWorksItem): string {
  return item.studios.map((s) => s.slug).join("+")
}

/**
 * Studio Archive 列表（M1 首个落地页面，列表交互层）。
 *
 * 两个视图：
 *  - 「按作品」（默认）：以制作组为单元，卡头是组名 + 作品数，卡内按作品逐行。
 *  - 「按首字」：首字分区 + 吸顶索引条 + 搜索 + 加载更多（原样保留，不做改动）。
 *
 * 页头(header)由 Server Component 在 page.tsx 渲染后作为 prop 传入；视图切换胶囊走
 * ArchiveShell 的 toolbar 槽位，状态由 URL ?view= 驱动（Client 侧 router.replace 软切换）。
 * 切换视图时 loading 置真 → 列表区显示骨架屏，旧视图内容不闪回。
 */
export function StudioArchiveClient({
  q,
  sort,
  view,
  total,
  density,
  state,
  header,
}: {
  q: string
  sort: "count" | "name"
  view: ArchiveView
  total: number
  density: ArchiveDensity
  state?: ArchiveState
  header: ReactNode
}) {
  const isWorks = view === "works"
  const [makers, setMakers] = useState<MakerSummary[]>([])
  const [studios, setStudios] = useState<StudioWorksItem[]>([])
  const [worksTotal, setWorksTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [activeLetter, setActiveLetter] = useState<string | undefined>(undefined)
  const reqId = useRef(0)

  const fetchMakers = useCallback(async (page: number): Promise<MakerListResult> => {
    const params = new URLSearchParams({ sort, pageSize: String(isWorks ? PAGE_SIZE : total), page: String(page) })
    if (q) params.set("search", q)
    const res = await api.get<{ data: MakerListResult }>(`/api/credits/studios?${params}`, { timeout: 30000 })
    return parseApiResponse<MakerListResult>(res)
  }, [sort, q, isWorks, total])

  const fetchWorks = useCallback(async (page: number): Promise<StudioWorksResult> => {
    const params = new URLSearchParams({ sort, pageSize: String(WORKS_PAGE_SIZE), page: String(page) })
    if (q) params.set("search", q)
    const res = await api.get<{ data: StudioWorksResult }>(`/api/credits/studios/works?${params}`, { timeout: 30000 })
    return parseApiResponse<StudioWorksResult>(res)
  }, [sort, q])

  // 首屏 / q、sort、view 变化时重置
  const reset = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    setError(false)
    try {
      if (isWorks) {
        const d = await fetchWorks(1)
        if (id !== reqId.current) return
        setStudios(d.studios || [])
        setWorksTotal(d.total ?? 0)
      } else {
        const d = await fetchMakers(1)
        if (id !== reqId.current) return
        setMakers(d.makers || [])
      }
    } catch {
      if (id === reqId.current) {
        setStudios([])
        setMakers([])
        setError(true)
      }
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [isWorks, fetchWorks, fetchMakers])

  useEffect(() => {
    reset()
  }, [reset])

  // 追加下一页（去重，防止边界重复）
  const loadMore = useCallback(async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      if (isWorks) {
        const nextPage = Math.floor(studios.length / WORKS_PAGE_SIZE) + 1
        const d = await fetchWorks(nextPage)
        setStudios((prev) => {
          const seen = new Set(prev.map(studioCardKey))
          const fresh = (d.studios || []).filter((s) => !seen.has(studioCardKey(s)))
          return fresh.length ? [...prev, ...fresh] : prev
        })
      } else {
        const nextPage = Math.floor(makers.length / PAGE_SIZE) + 1
        const d = await fetchMakers(nextPage)
        setMakers((prev) => {
          const seen = new Set(prev.map((m) => m.normalized))
          const fresh = (d.makers || []).filter((m) => !seen.has(m.normalized))
          return fresh.length ? [...prev, ...fresh] : prev
        })
      }
    } catch {
      // 静默失败：控件保持可点击，用户可重试
    } finally {
      setLoadingMore(false)
    }
  }, [isWorks, fetchWorks, fetchMakers, studios.length, makers.length, loadingMore])

  const groups = groupByLatinFirstChar(makers, (m) => m.name)
  const availableLetters = groups.map((g) => g.key)
  // 「按首字」档已一次性取全，不再分页，故永不渲染加载更多控件与收尾文案
  const hasMore = false
  const worksHasMore = !loading && !error && studios.length > 0 && worksTotal > studios.length

  // scroll-spy：高亮当前可见首字分区（仅「按首字」视图挂载索引条时有意义）
  useEffect(() => {
    if (isWorks) return
    if (loading || error || makers.length === 0) return
    const grps = groupByLatinFirstChar(makers, (m) => m.name)
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
  }, [isWorks, loading, error, makers, q, sort])

  return (
    <ArchiveShell
      entity="studio"
      density={density}
      state={state}
      header={header}
      index={!isWorks && !loading && !error ? <AZIndex available={availableLetters} active={activeLetter} anchorPrefix={ANCHOR_PREFIX} /> : undefined}
    >
      {isWorks ? (
        <>
          {worksHasMore && (
            <ArchiveLoadMore
              loaded={studios.length}
              total={worksTotal}
              entity="制作组"
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          )}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <StudioWorksCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ArchivePlaceholder state="error" entity="studio" retryHref="/credits/studio" />
          ) : studios.length === 0 ? (
            <ArchivePlaceholder
              state="empty"
              entity="studio"
              message={q ? "没有匹配的制作组" : "暂无收录的制作组"}
            />
          ) : (
            // 同一行强制等高（网格 stretch）：作品多的卡撑高后，少的卡保持同高，多出的是底部留白
            <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1200px]:grid-cols-3">
              {studios.map((s) => (
                <StudioWorksCard key={studioCardKey(s)} data={s} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {hasMore && (
            <ArchiveLoadMore
              loaded={makers.length}
              total={total}
              entity="制作组"
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          )}
          {loading ? (
            <ArchivePlaceholder
              state="loading"
              entity="studio"
              loadingCount={density === "dense" ? 12 : 8}
              loadingDensity={density}
            />
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
        </>
      )}
    </ArchiveShell>
  )
}
