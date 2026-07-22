"use client"

import { useEmotionalMessages } from "@/hooks/use-emotional-messages"
import { Building2, Calendar, Clock, ExternalLink, Gamepad2 } from "lucide-react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"
import { IntroTab, ArchiveCard } from "./game-detail/intro-tab"
import { ReportDialog } from "./game-detail/report-dialog"
import { Tag } from "@/components/ui/tag"

/** 资源 Tab — 懒加载 */
const ResourceTab = dynamic(() => import("./game-detail/resource-tab").then(m => ({ default: m.ResourceTab })), {
  loading: () => <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />,
  ssr: false,
})

/** 评论 */
const CommentSection = dynamic(() => import("./comment-section").then(m => ({ default: m.CommentSection })), {
  loading: () => <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" />,
  ssr: false,
})

type Creator = {
  id: string
  name: string
  nameJa: string | null
  avatar: string | null
  role: string
}

type DownloadLink = { label: string; url: string }

type Comment = {
  id: string
  content: string
  imageUrl?: string
  likeCount: number
  createdAt: string
  user: { id: string; username: string; avatar: string | null }
}

type TagInfo = { name: string; color: string; groupName?: string }

const TABS = [
  { key: "intro" as const, label: "简介" },
  { key: "resource" as const, label: "资源" },
  { key: "comments" as const, label: "评论" },
]

const favMsgKeys = ["favorite_added", "favorite_removed"]

export default function GameDetailClient({
  description,
  allDescriptions,
  downloadLinks,
  creators,
  comments,
  isLoggedIn,
  currentUserId,
  gameId,
  isFav,
  favCount,
  gameTags,
  vndbId,
  releaseDate,
  gameDuration,
  studioName,
  username,
  userAvatar,
  resourceTagColor,
  publisherId,
}: {
  description: string
  allDescriptions?: { lang: string; label: string; text: string }[]
  downloadLinks: DownloadLink[]
  creators: Creator[]
  comments: Comment[]
  isLoggedIn: boolean
  currentUserId?: string
  gameId: string
  isFav: boolean
  favCount: number
  gameTags?: TagInfo[]
  vndbId?: string
  releaseDate?: string
  gameDuration?: string
  studioName?: string
  username?: string
  userAvatar?: string | null
  resourceTagColor?: string
  publisherId?: string
}) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"intro" | "resource" | "comments">(() => {
    const t = searchParams.get("tab")
    if (t === "resource" || t === "intro" || t === "comments") return t
    return "intro"
  })
  const [fav, setFav] = useState(isFav)
  const [favCnt, setFavCnt] = useState(favCount)
  const [commentCnt, setCommentCnt] = useState(comments.length)
  const [favPending, setFavPending] = useState(false)
  const favAbortRef = useRef<AbortController | null>(null)
  const { messages: favMsgs } = useEmotionalMessages(favMsgKeys)
  const [mobileArchiveOpen, setMobileArchiveOpen] = useState(true)
  const sliderRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 同步来自 GameDetailTopClient 的收藏状态变化
  useEffect(() => {
    function onFavChange(e: Event) {
      const detail = (e as CustomEvent).detail as { isFav: boolean }
      setFav(detail.isFav)
      setFavCnt((c) => detail.isFav ? c + 1 : Math.max(0, c - 1))
    }
    window.addEventListener("game-fav-change", onFavChange)
    return () => window.removeEventListener("game-fav-change", onFavChange)
  }, [])

  // 举报
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const handleReport = useCallback(async (reason: string) => {
    if (!reason || reportSubmitting) return
    setReportSubmitting(true)
    try {
      const { ok } = await apiFetchSafe(`/api/games/${gameId}/report`, {
        method: "POST",
        body: { reason },
      })
      if (ok) {
        toast.success("举报已提交，感谢反馈")
        setReportOpen(false)
      } else {
        toast.error("举报失败，请稍后重试")
      }
    } catch {
      toast.error("举报失败，请稍后重试")
    } finally {
      setReportSubmitting(false)
    }
  }, [gameId, reportSubmitting])

  // Sliding block animation - 使用 requestAnimationFrame 替代 useLayoutEffect 避免强制同步布局
  useEffect(() => {
    const updateSlider = () => {
      requestAnimationFrame(() => {
        const container = containerRef.current
        const slider = sliderRef.current
        if (!container || !slider) return
        const idx = TABS.findIndex(t => t.key === tab)
        const buttons = container.querySelectorAll<HTMLButtonElement>('[data-tab-btn]')
        const btn = buttons[idx]
        if (!btn) return
        const containerRect = container.getBoundingClientRect()
        const btnRect = btn.getBoundingClientRect()
        slider.style.width = `${btnRect.width}px`
        slider.style.transform = `translateX(${btnRect.left - containerRect.left - 2}px)`
      })
    }
    updateSlider()
  }, [tab])

  // 监听下载按钮切换 Tab 事件
  useEffect(() => {
    function handleSwitchTab(e: CustomEvent) {
      const tabName = e.detail
      if (tabName === "resource" || tabName === "intro" || tabName === "comments") {
        setTab(tabName as "intro" | "resource" | "comments")
      }
    }
    window.addEventListener("game-detail-switch-tab", handleSwitchTab as EventListener)
    return () => window.removeEventListener("game-detail-switch-tab", handleSwitchTab as EventListener)
  }, [])

  const toggleFav = useCallback(async () => {
    if (!isLoggedIn || favPending) return
    setFavPending(true)

    if (favAbortRef.current) favAbortRef.current.abort()
    const controller = new AbortController()
    favAbortRef.current = controller

    const prevFav = fav
    const prevCnt = favCnt
    setFav(!prevFav)
    setFavCnt(prevFav ? prevCnt - 1 : prevCnt + 1)

    try {
      const { ok, data } = await apiFetchSafe<{ isFav?: boolean; count?: number }>(`/api/games/${gameId}/favorite`, { method: "POST", signal: controller.signal })
      if (controller.signal.aborted) return
      if (ok) {
        setFav(data?.isFav ?? prevFav)
        setFavCnt(data?.count ?? prevCnt)
        window.dispatchEvent(new CustomEvent("game-fav-change", { detail: { isFav: data?.isFav } }))
        toast.success(data?.isFav
          ? (favMsgs.favorite_added ? `${favMsgs.favorite_added.emoji} ${favMsgs.favorite_added.title}` : "已收藏")
          : (favMsgs.favorite_removed ? `${favMsgs.favorite_removed.emoji} ${favMsgs.favorite_removed.title}` : "已取消收藏"))
      } else {
        setFav(prevFav)
        setFavCnt(prevCnt)
      }
    } catch {
      if (!controller.signal.aborted) {
        setFav(prevFav)
        setFavCnt(prevCnt)
      }
    } finally {
      if (!controller.signal.aborted) setFavPending(false)
    }
  }, [isLoggedIn, favPending, fav, favCnt, gameId, favMsgs])


  return (
    <div>
      {/* ══════ 下方区域 — 左 Tab 导航 + 右 300px 档案卡 ══════ */}
      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start">

        {/* ─── 左侧: Tab 导航 + 内容 ─── */}
        <div className="flex-1 min-w-0 lg:w-[calc(100%-380px)]">
          {/* Tab 栏：圆角底槽 + 悬浮滑块 — 横向填满 */}
          <div ref={containerRef}
            className="relative flex rounded-xl p-0.5"
            role="tablist"
            aria-label="游戏详情导航"
            style={{
              backgroundColor: "var(--tab-trough, var(--secondary))",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
            }}>
            {/* 滑块 */}
            <div ref={sliderRef}
              className="absolute top-0.5 left-0 h-[calc(100%-4px)] rounded-xl transition-all duration-300 ease-out"
              aria-hidden="true"
              style={{
                backgroundColor: "var(--tab-active, var(--background))",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
              }}
            />
            {TABS.map((t) => (
              <button
                key={t.key}
                data-tab-btn
                role="tab"
                aria-selected={tab === t.key}
                aria-controls={`tabpanel-${t.key}`}
                id={`tab-${t.key}`}
                onClick={() => setTab(t.key)}
                className="relative z-10 flex-1 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors duration-300 text-center"
                style={{
                  color: tab === t.key ? "var(--tab-active-text, var(--foreground))" : "var(--tab-inactive-text, var(--muted-foreground))",
                  fontWeight: tab === t.key ? 600 : 500,
                }}
              >
                {t.label}
                {t.key === "comments" && commentCnt > 0 && (
                  <span className="ml-1.5 text-micro opacity-60">{commentCnt}</span>
                )}
              </button>
            ))}
          </div>

          {/* ─── Tab 内容 ─── */}
          <div className="pt-4">
            {/* 游戏简介 — 提取至 IntroTab 组件 */}
            {tab === "intro" && (
              <div role="tabpanel" id="tabpanel-intro" aria-labelledby="tab-intro">
                <IntroTab
                  description={description}
                  allDescriptions={allDescriptions}
                  creators={creators}
                />
              </div>
            )}

            {/* 游戏资源 */}
            {tab === "resource" && (
              <div role="tabpanel" id="tabpanel-resource" aria-labelledby="tab-resource" data-section="resources">
                <ResourceTab
                  downloadLinks={downloadLinks}
                  isLoggedIn={isLoggedIn}
                  isFav={fav}
                  favCount={favCnt}
                  onToggleFav={toggleFav}
                  roleLabels={{ scenario: "脚本", art: "原画", chardesign: "角色设计", director: "导演", music: "音乐", songs: "主题曲" }}
                  gameId={gameId}
                  currentUserId={currentUserId}
                  username={username}
                  userAvatar={userAvatar}
                  publisherId={publisherId}
                  resourceTagColor={resourceTagColor}
                />
              </div>
            )}

            {/* 评论 */}
            {tab === "comments" && (
              <div role="tabpanel" id="tabpanel-comments" aria-labelledby="tab-comments">
                <CommentSection
                  gameId={gameId}
                  comments={comments}
                  isLoggedIn={isLoggedIn}
                  currentUserId={currentUserId}
                  onCountChange={setCommentCnt}
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── 移动端档案信息（折叠面板，仅简介 tab）─ */}
        {tab === "intro" && (
          <div className="lg:hidden">
            <ArchiveCard
              releaseDate={releaseDate}
              studioName={studioName}
              gameDuration={gameDuration}
              vndbId={vndbId}
              gameTags={gameTags}
              isOpen={mobileArchiveOpen}
              onToggle={() => setMobileArchiveOpen(v => !v)}
            />
          </div>
        )}

        {/* ─── 右侧: 档案卡片 300px (仅桌面端显示) ─── */}
        <div className="hidden lg:block w-[360px] shrink-0 rounded-2xl p-6 bg-card ring-1 ring-border card-shadow">

          {/* 档案行列表 */}
          <div className="space-y-3.5">

            {/* 发售日期 */}
            {releaseDate && (
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1.5 min-w-0">
                  <span className="text-sm font-medium shrink-0 text-muted-foreground">发售日期：</span>
                  <span className="text-sm font-semibold text-foreground">{releaseDate}</span>
                </div>
              </div>
            )}

            {/* 制作会社 */}
            {studioName && (
              <div className="flex items-start gap-2.5">
                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1.5 min-w-0">
                  <span className="text-sm font-medium shrink-0 text-muted-foreground">制作会社：</span>
                  <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold bg-secondary text-foreground">{studioName}</span>
                </div>
              </div>
            )}

            {/* 游戏时长 */}
            {gameDuration && (
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1.5 min-w-0">
                  <span className="text-sm font-medium shrink-0 text-muted-foreground">游戏时长：</span>
                  <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold bg-secondary text-foreground">
                    {gameDuration}
                  </span>
                </div>
              </div>
            )}

            {/* VNDB 链接 */}
            {vndbId && (() => {
              const rawId = vndbId.startsWith("v") ? vndbId : `v${vndbId}`
              const numericId = rawId.replace(/^v/, "")
              return (
                <div className="flex items-start gap-2.5">
                  <ExternalLink className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                  <div className="flex items-center gap-x-1.5 min-w-0">
                    <span className="text-sm font-medium shrink-0 text-muted-foreground">VNDB：</span>
                    <a
                      href={`https://vndb.org/v${numericId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-80 bg-secondary text-foreground"
                    >
                      v{numericId}
                    </a>
                  </div>
                </div>
              )
            })()}

            {/* 游戏标签 */}
            {gameTags && gameTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 -mx-4 px-4">
                <Gamepad2 className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                <span className="text-sm font-medium shrink-0 text-muted-foreground">游戏标签</span>
                {gameTags.map((tag, i) => (
                  <Tag key={i} color={tag.color || "#6b7280"}>{tag.name}</Tag>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReportDialog
        show={reportOpen}
        onClose={() => setReportOpen(false)}
        reportSubmitting={reportSubmitting}
        onSubmit={handleReport}
      />
    </div>
  )
}