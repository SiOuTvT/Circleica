"use client"

import { Building2, Calendar, ChevronDown, Clock, ExternalLink, Gamepad2 } from "lucide-react"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ResourceTab } from "./game-detail/resource-tab"

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

/* 莫兰迪灰蓝色调 — 已迁移至 globals.css CSS 变量 + 工具类 */

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
}) {
  const [tab, setTab] = useState<"intro" | "resource" | "comments">("intro")
  const [fav, setFav] = useState(isFav)
  const [favCnt, setFavCnt] = useState(favCount)
  const [favPending, setFavPending] = useState(false)
  const favAbortRef = useRef<AbortController | null>(null)
  const [mobileArchiveOpen, setMobileArchiveOpen] = useState(true)
  const sliderRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sliding block animation
  useEffect(() => {
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
    slider.style.transform = `translateX(${btnRect.left - containerRect.left - 2}px)` // 2 = p-0.5 padding
  }, [tab])

  const toggleFav = useCallback(async () => {
    if (!isLoggedIn || favPending) return
    setFavPending(true)

    // Abort previous request
    if (favAbortRef.current) favAbortRef.current.abort()
    const controller = new AbortController()
    favAbortRef.current = controller

    // Optimistic update
    const prevFav = fav
    const prevCnt = favCnt
    setFav(!prevFav)
    setFavCnt(prevFav ? prevCnt - 1 : prevCnt + 1)

    try {
      const res = await fetch(`/api/games/${gameId}/favorite`, { method: "POST", signal: controller.signal })
      if (res.ok) {
        const data = await res.json()
        if (!controller.signal.aborted) {
          setFav(data.isFav)
          setFavCnt(data.count)
          toast.success(data.isFav ? "已收藏" : "已取消收藏")
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        setFav(prevFav)
        setFavCnt(prevCnt)
      }
    } finally {
      if (!controller.signal.aborted) setFavPending(false)
    }
  }, [isLoggedIn, favPending, fav, favCnt, gameId])


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
                {t.key === "comments" && comments.length > 0 && (
                  <span className="ml-1.5 text-[10px] opacity-60">{comments.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* ─── Tab 内容 ─── */}
          <div className="pt-4">
            {/* 游戏简介 */}
            {tab === "intro" && (
              <div role="tabpanel" id="tabpanel-intro" aria-labelledby="tab-intro">
                {allDescriptions && allDescriptions.length > 0 ? (
                  <div className="space-y-5">
                    {allDescriptions.map((d, idx) => (
                      <div key={d.lang}>
                        {/* 语言标签（仅多语言时显示） */}
                        {allDescriptions.length > 1 && (
                          <div className="mb-2">
                            <span
                              className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                background: "rgba(var(--theme-r), var(--theme-g), var(--theme-b), 0.1)",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              {d.label}
                            </span>
                          </div>
                        )}
                        <div
                          className="prose prose-invert max-w-none leading-relaxed"
                          style={{ fontSize: "15px", lineHeight: "1.9", color: "var(--foreground)" }}
                          dangerouslySetInnerHTML={{ __html: d.text }}
                        />
                        {/* 分隔线（非最后一个） */}
                        {idx < allDescriptions.length - 1 && (
                          <div className="mt-4 border-t border-border/50" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : description ? (
                  <div
                    className="prose prose-invert max-w-none leading-relaxed"
                    style={{ fontSize: "15px", lineHeight: "1.9", color: "var(--foreground)" }}
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic">暂无简介</p>
                )}
              </div>
            )}

            {/* 游戏资源 */}
            {tab === "resource" && (
              <div role="tabpanel" id="tabpanel-resource" aria-labelledby="tab-resource">
                <ResourceTab
                  downloadLinks={downloadLinks}
                  creators={creators}
                  isLoggedIn={isLoggedIn}
                  isFav={fav}
                  favCount={favCnt}
                  onToggleFav={toggleFav}
                  roleLabels={{ scenario: "脚本", art: "原画", chardesign: "角色设计", director: "导演", music: "音乐", songs: "主题曲" }}
                  gameId={gameId}
                  currentUserId={currentUserId}
                  username={username}
                  userAvatar={userAvatar}
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
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── 移动端档案信息（折叠面板，仅简介tab显示）─── */}
        {tab === "intro" && <div className="mt-6 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileArchiveOpen(v => !v)}
            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" style={{ opacity: 0.6 }} />
              游戏档案
            </span>
            <ChevronDown
              className="h-4 w-4 transition-transform duration-200"
              style={{ opacity: 0.6, transform: mobileArchiveOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          {mobileArchiveOpen && (
            <div className="mt-2 space-y-2.5 rounded-xl p-2.5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              {releaseDate && (
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                  <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>发售日期</span>
                  <span className="ml-auto text-xs font-semibold" style={{ color: "var(--foreground)" }}>{releaseDate}</span>
                </div>
              )}
              {studioName && (
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                  <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>制作会社</span>
                  <span className="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>{studioName}</span>
                </div>
              )}
              {gameDuration && (
                <div className="flex items-center gap-2.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                  <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>游戏时长</span>
                  <span className="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>{gameDuration}</span>
                </div>
              )}
              {vndbId && (() => {
                const rawId = vndbId.startsWith("v") ? vndbId : `v${vndbId}`
                const numericId = rawId.replace(/^v/, "")
                return (
                  <div className="flex items-center gap-2.5">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
                    <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>VNDB</span>
                    <a href={`https://vndb.org/v${numericId}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all hover:opacity-80" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>v{numericId}</a>
                  </div>
                )
              })()}
              {/* 游戏标签 — 图标+标题+标签全部 inline，换行从最左端开始 */}
              {gameTags && gameTags.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <Gamepad2 className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "var(--muted-foreground)" }} />
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>游戏标签</span>
                    {gameTags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: tag.color ? `${tag.color}20` : "var(--secondary)", color: tag.color || "var(--foreground)" }}>{tag.name}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>}

        {/* ─── 右侧: 档案卡片 300px (仅桌面端显示) ─── */}
        <div className="hidden lg:block w-[360px] shrink-0 rounded-2xl p-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>

          {/* 档案行列表 */}
          <div className="space-y-3.5">

            {/* 发售日期 */}
            {releaseDate && (
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1.5 min-w-0">
                  <span className="text-sm font-medium shrink-0" style={{ color: "var(--muted-foreground)" }}>发售日期：</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{releaseDate}</span>
                </div>
              </div>
            )}

            {/* 制作会社 */}
            {studioName && (
              <div className="flex items-start gap-2.5">
                <Building2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1.5 min-w-0">
                  <span className="text-sm font-medium shrink-0" style={{ color: "var(--muted-foreground)" }}>制作会社：</span>
                  <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>{studioName}</span>
                </div>
              </div>
            )}

            {/* 游戏时长 */}
            {gameDuration && (
              <div className="flex items-start gap-2.5">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1.5 min-w-0">
                  <span className="text-sm font-medium shrink-0" style={{ color: "var(--muted-foreground)" }}>游戏时长：</span>
                  <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>
                    {gameDuration}
                  </span>
                </div>
              </div>
            )}

            {/* VNDB 链接 */}
            {vndbId && (() => {
              // 兼容 vndbId 存储为 "v12345" 或纯数字 "12345" 两种格式
              const rawId = vndbId.startsWith("v") ? vndbId : `v${vndbId}`
              const numericId = rawId.replace(/^v/, "")
              return (
                <div className="flex items-start gap-2.5">
                  <ExternalLink className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} strokeWidth={2} />
                  <div className="flex items-center gap-x-1.5 min-w-0">
                    <span className="text-sm font-medium shrink-0" style={{ color: "var(--muted-foreground)" }}>VNDB：</span>
                    <a
                      href={`https://vndb.org/v${numericId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: "var(--secondary)", color: "var(--foreground)" }}
                    >
                      v{numericId}
                    </a>
                  </div>
                </div>
              )
            })()}

            {/* 游戏标签 */}
            {gameTags && gameTags.length > 0 && (
              <div className="flex items-start gap-2.5">
                <Gamepad2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--muted-foreground)" }} strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 min-w-0">
                  <span className="text-sm font-medium shrink-0" style={{ color: "var(--muted-foreground)" }}>游戏标签：</span>
                  {gameTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold" style={{ background: tag.color ? `${tag.color}20` : "var(--secondary)", color: tag.color || "var(--foreground)" }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}