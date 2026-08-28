"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { parseApiResponse } from "@/lib/api-handler-client"
import { ArchiveShell } from "./archive-shell"
import type { ArchiveView } from "./view-tabs"
import { EntityCard } from "./entity-card"
import { WorkCrewCard, WorkCrewCardSkeleton } from "./work-crew-card"
import { AZIndex } from "./az-index"
import { ArchiveLoadMore } from "./load-more"
import { ArchivePlaceholder } from "./archive-placeholder"
import { groupByLatinFirstChar, DENSITY_GRID } from "./density"
import type { ArchiveDensity, ArchiveState } from "./density"
import type { CreatorSummary, CreatorListResult } from "@/lib/creators"
import type { WorkCrewItem, WorkCrewResult } from "@/lib/credits-works"

/** 首屏 + 每批增量加载的条数（分页由服务端 SQL 完成，避免一次全量拉取大库） */
const PAGE_SIZE = 96
const WORKS_PAGE_SIZE = 24
const ANCHOR_PREFIX = "archive-letter-"

/**
 * Creator Archive 列表（与 Studio Archive 同构，列表交互层）。
 *
 * 两个视图：
 *  - 「按作品」（默认）：以游戏为单元，卡片带该作品的班底名单，两列大卡。
 *  - 「按首字」：首字分区 + 吸顶索引条 + 搜索 + 加载更多（原样保留，不做改动）。
 *
 * 页头(header)由 Server Component 在 page.tsx 渲染后作为 prop 传入；视图切换胶囊走
 * ArchiveShell 的 toolbar 槽位，状态由 URL ?view= 驱动（Client 侧 router.replace 软切换）。
 * 切换视图时 loading 置真 → 列表区显示骨架屏，旧视图内容不闪回。
 */
export function CreatorArchiveClient({
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
  const [creators, setCreators] = useState<CreatorSummary[]>([])
  const [works, setWorks] = useState<WorkCrewItem[]>([])
  const [worksTotal, setWorksTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [activeLetter, setActiveLetter] = useState<string | undefined>(undefined)
  const reqId = useRef(0)

  const fetchCreators = useCallback(async (page: number): Promise<CreatorListResult> => {
    const params = new URLSearchParams({ sort, pageSize: String(PAGE_SIZE), page: String(page) })
    if (q) params.set("search", q)
    const res = await api.get<{ data: CreatorListResult }>(`/api/creators?${params}`, { timeout: 30000 })
    return parseApiResponse<CreatorListResult>(res)
  }, [sort, q])

  const fetchWorks = useCallback(async (page: number): Promise<WorkCrewResult> => {
    const params = new URLSearchParams({ pageSize: String(WORKS_PAGE_SIZE), page: String(page) })
    if (q) params.set("search", q)
    const res = await api.get<{ data: WorkCrewResult }>(`/api/credits/works?${params}`, { timeout: 30000 })
    return parseApiResponse<WorkCrewResult>(res)
  }, [q])

  // 首屏 / q、sort、view 变化时重置
  const reset = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    setError(false)
    try {
      if (isWorks) {
        const d = await fetchWorks(1)
        if (id !== reqId.current) return
        setWorks(d.games || [])
        setWorksTotal(d.total ?? 0)
      } else {
        const d = await fetchCreators(1)
        if (id !== reqId.current) return
        setCreators(d.creators || [])
      }
    } catch {
      if (id === reqId.current) {
        setWorks([])
        setCreators([])
        setError(true)
      }
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [isWorks, fetchWorks, fetchCreators])

  useEffect(() => {
    reset()
  }, [reset])

  // 追加下一页（去重，防止边界重复）
  const loadMore = useCallback(async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      if (isWorks) {
        const nextPage = Math.floor(works.length / WORKS_PAGE_SIZE) + 1
        const d = await fetchWorks(nextPage)
        setWorks((prev) => {
          const seen = new Set(prev.map((w) => w.id))
          const fresh = (d.games || []).filter((w) => !seen.has(w.id))
          return fresh.length ? [...prev, ...fresh] : prev
        })
      } else {
        const nextPage = Math.floor(creators.length / PAGE_SIZE) + 1
        const d = await fetchCreators(nextPage)
        setCreators((prev) => {
          const seen = new Set(prev.map((c) => c.id))
          const fresh = (d.creators || []).filter((c) => !seen.has(c.id))
          return fresh.length ? [...prev, ...fresh] : prev
        })
      }
    } catch {
      // 静默失败：控件保持可点击，用户可重试
    } finally {
      setLoadingMore(false)
    }
  }, [isWorks, fetchWorks, fetchCreators, works.length, creators.length, loadingMore])

  const groupName = (c: CreatorSummary) => c.nameJa || c.name
  const groups = groupByLatinFirstChar(creators, groupName)
  const availableLetters = groups.map((g) => g.key)
  const hasMore = !loading && !error && creators.length > 0 && total > creators.length
  const worksHasMore = !loading && !error && works.length > 0 && worksTotal > works.length

  // scroll-spy：高亮当前可见首字分区（仅「按首字」视图挂载索引条时有意义）
  useEffect(() => {
    if (isWorks) return
    if (loading || error || creators.length === 0) return
    const grps = groupByLatinFirstChar(creators, groupName)
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
  }, [isWorks, loading, error, creators, q, sort])

  return (
    <ArchiveShell
      entity="creator"
      density={density}
      state={state}
      header={header}
      index={!isWorks && !loading && !error ? <AZIndex available={availableLetters} active={activeLetter} anchorPrefix={ANCHOR_PREFIX} /> : undefined}
    >
      {isWorks ? (
        <>
          {worksHasMore && (
            <ArchiveLoadMore
              loaded={works.length}
              total={worksTotal}
              entity="作品"
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          )}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <WorkCrewCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ArchivePlaceholder state="error" entity="creator" retryHref="/credits/creator" />
          ) : works.length === 0 ? (
            <ArchivePlaceholder
              state="empty"
              entity="game"
              message={q ? "没有匹配的作品" : "暂无收录的作品"}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {works.map((w) => (
                <WorkCrewCard key={w.id} data={w} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {hasMore && (
            <ArchiveLoadMore
              loaded={creators.length}
              total={total}
              entity="创作者"
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          )}
          {loading ? (
            <ArchivePlaceholder
              state="loading"
              entity="creator"
              loadingCount={density === "dense" ? 12 : 8}
              loadingDensity={density}
              loadingVariant="creator"
            />
          ) : error ? (
            <ArchivePlaceholder state="error" entity="creator" retryHref="/credits/creator" />
          ) : creators.length === 0 ? (
            <ArchivePlaceholder
              state="empty"
              entity="creator"
              message={q ? "没有匹配的创作者" : "暂无收录的创作者"}
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
                          slug: c.slug,
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
        </>
      )}
    </ArchiveShell>
  )
}
