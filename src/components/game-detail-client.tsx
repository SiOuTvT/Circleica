"use client"

import { BookOpen, Building2, Calendar, ChevronDown, Clock, Download, ExternalLink, Gamepad2, Heart, Monitor } from "lucide-react"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"

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

type TagInfo = { name: string; color: string }
type FileSizeEntry = { value: string; unit: string }

const TABS = [
  { key: "intro" as const, label: "简介" },
  { key: "resource" as const, label: "资源" },
  { key: "comments" as const, label: "评论" },
]

/* 莫兰迪灰蓝色调 — 已迁移至 globals.css CSS 变量 + 工具类 */

export default function GameDetailClient({
  description,
  screenshots,
  downloadLinks,
  creators,
  comments,
  isLoggedIn,
  currentUserId,
  gameId,
  isFav,
  favCount,
  fileSizes,
  platformTags,
  languageTags,
  gameTags,
  viewCount,
  downloadCount,
  vndbId,
  releaseDate,
  gameDuration,
  studioName,
}: {
  description: string
  screenshots: string[]
  downloadLinks: DownloadLink[]
  creators: Creator[]
  comments: Comment[]
  isLoggedIn: boolean
  currentUserId?: string
  gameId: string
  isFav: boolean
  favCount: number
  fileSizes?: FileSizeEntry[]
  platformTags?: string[]
  languageTags?: string[]
  gameTags?: TagInfo[]
  viewCount?: number
  downloadCount?: number
  vndbId?: string
  releaseDate?: string
  gameDuration?: string
  studioName?: string
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
    slider.style.transform = `translateX(${btnRect.left - containerRect.left - 4}px)` // 4 = p-1 padding
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

  // Split gameTags by category (use tag.color to differentiate)
  const genreTags = gameTags?.filter(t => t.color === "#818cf8" || t.color === "#a78bfa") ?? []
  const storyTags = gameTags?.filter(t => t.color === "#38bdf8" || t.color === "#22d3ee") ?? []

  return (
    <div>
      {/* ══════ 下方区域 — 左 Tab 导航 + 右 300px 档案卡 ══════ */}
      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start">

        {/* ─── 左侧: Tab 导航 + 内容 ─── */}
        <div className="flex-1 min-w-0 lg:w-[calc(100%-320px)]">
          {/* Tab 栏：圆角底槽 + 悬浮滑块 — 横向填满 */}
          <div ref={containerRef}
            className="relative flex rounded-2xl p-1"
            role="tablist"
            aria-label="游戏详情导航"
            style={{
              backgroundColor: "var(--tab-trough, hsl(var(--secondary)))",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
            }}>
            {/* 滑块 */}
            <div ref={sliderRef}
              className="absolute top-1 left-0 h-[calc(100%-8px)] rounded-xl transition-all duration-300 ease-out"
              aria-hidden="true"
              style={{
                backgroundColor: "var(--tab-active, hsl(var(--background)))",
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
                  color: tab === t.key ? "var(--tab-active-text, hsl(var(--foreground)))" : "var(--tab-inactive-text, hsl(var(--muted-foreground)))",
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
          <div className="pt-6">
            {/* 游戏简介 */}
            {tab === "intro" && (
              <div role="tabpanel" id="tabpanel-intro" aria-labelledby="tab-intro">
                {description ? (
                  <div
                    className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed"
                    style={{ fontSize: "14px", lineHeight: "1.85" }}
                    dangerouslySetInnerHTML={{ __html: description }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground/60 italic">暂无简介</p>
                )}
              </div>
            )}

            {/* 游戏资源 */}
            {tab === "resource" && (
              <div role="tabpanel" id="tabpanel-resource" aria-labelledby="tab-resource" className="space-y-5">
                {downloadLinks.length > 0 ? (
                  <div className="space-y-2">
                    {downloadLinks.map((dl, i) => (
                      <a
                        key={i}
                        href={dl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`下载 ${dl.label || "游戏资源"}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "var(--clr-blue)" }}
                      >
                        <Download className="w-4 h-4" strokeWidth={2} />
                        {dl.label || "下载"}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无下载链接</p>
                )}

                <button
                  onClick={toggleFav}
                  disabled={!isLoggedIn}
                  aria-label={fav ? "取消收藏此游戏" : "收藏此游戏"}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: fav ? "var(--clr-blue)" : "hsl(var(--secondary))",
                    color: fav ? "#000" : "hsl(var(--muted-foreground))",
                  }}
                >
                  <Heart className="w-4 h-4" strokeWidth={2} fill={fav ? "#000" : "none"} />
                  {fav ? "已收藏" : "收藏"} ({favCnt})
                </button>

                {creators.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">制作人员</h3>
                    <div className="space-y-3">
                      {creators.map((c) => (
                        <a
                          key={`${c.id}-${c.role}`}
                          href={`/creators/${c.id}`}
                          className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary"
                        >
                          {c.avatar ? (
                            <img src={c.avatar} alt={c.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div
                              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                              style={{ background: "linear-gradient(135deg, var(--clr-sky), var(--clr-blue))" }}
                            >
                              {(c.nameJa || c.name)[0]}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.nameJa || c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {{ scenario: "脚本", art: "原画", chardesign: "角色设计", director: "导演", music: "音乐", songs: "主题曲" }[c.role] ?? c.role}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
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
            className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium mld-text transition-colors"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 opacity-50" />
              游戏档案
            </span>
            <ChevronDown
              className="h-4 w-4 opacity-50 transition-transform duration-200"
              style={{ transform: mobileArchiveOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          {mobileArchiveOpen && (
            <div className="mt-2 space-y-2 rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              {releaseDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 mld-text" />
                  <span className="text-xs mld-text">发售日期</span>
                  <span className="ml-auto text-xs font-semibold text-foreground">{releaseDate}</span>
                </div>
              )}
              {studioName && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 mld-text" />
                  <span className="text-xs mld-text">制作会社</span>
                  <span className="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium mld-bg">{studioName}</span>
                </div>
              )}
              {platformTags && platformTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <Monitor className="h-3.5 w-3.5 mld-text" />
                  <span className="text-xs mld-text">支持平台</span>
                  <div className="ml-auto flex flex-wrap justify-end gap-1">
                    {platformTags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium mld-bg">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {genreTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-3.5 w-3.5 mld-text" />
                  <span className="text-xs mld-text">游戏类型</span>
                  <div className="ml-auto flex flex-wrap justify-end gap-1">
                    {genreTags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium mld-bg-purple">{tag.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {gameDuration && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 mld-text" />
                  <span className="text-xs mld-text">游戏时长</span>
                  <span className="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium mld-bg">{gameDuration}</span>
                </div>
              )}
              {storyTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 mld-text" />
                  <span className="text-xs mld-text">剧情标签</span>
                  <div className="ml-auto flex flex-wrap justify-end gap-1">
                    {storyTags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium mld-bg">{tag.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {vndbId && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5 mld-text" />
                  <span className="text-xs mld-text">VNDB</span>
                  <a href={`https://vndb.org/v${vndbId}`} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium transition-all hover:opacity-80 mld-bg">v{vndbId}</a>
                </div>
              )}
            </div>
          )}
        </div>}

        {/* ─── 右侧: 档案卡片 300px (仅桌面端显示) ─── */}
        <div className="hidden lg:block w-[300px] shrink-0 rounded-2xl p-5"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>

          {/* 档案行列表 — 严格顺序：发售日期→制作会社→支持平台→游戏类型→游戏时长→剧情标签→VNDB */}
          <div className="space-y-3">

            {/* 发售日期 */}
            {releaseDate && (
              <div className="flex items-start gap-2">
                <Calendar className="h-3.5 w-3.5 mt-0.5 shrink-0 mld-text" strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1 min-w-0">
                  <span className="text-xs font-medium shrink-0 mld-text">发售日期：</span>
                  <span className="text-xs font-semibold text-foreground">{releaseDate}</span>
                </div>
              </div>
            )}

            {/* 制作会社 */}
            {studioName && (
              <div className="flex items-start gap-2">
                <Building2 className="h-3.5 w-3.5 mt-0.5 shrink-0 mld-text" strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1 min-w-0">
                  <span className="text-xs font-medium shrink-0 mld-text">制作会社：</span>
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium mld-bg">{studioName}
                  </span>
                </div>
              </div>
            )}

            {/* 支持平台 */}
            {platformTags && platformTags.length > 0 && (
              <div className="flex items-start gap-2">
                <Monitor className="h-3.5 w-3.5 mt-0.5 shrink-0 mld-text" strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1 min-w-0">
                  <span className="text-xs font-medium shrink-0 mld-text">支持平台：</span>
                  {platformTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium mld-bg">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 游戏类型 */}
            {genreTags.length > 0 && (
              <div className="flex items-start gap-2">
                <Gamepad2 className="h-3.5 w-3.5 mt-0.5 shrink-0 mld-text" strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1 min-w-0">
                  <span className="text-xs font-medium shrink-0 mld-text">游戏类型：</span>
                  {genreTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium mld-bg-purple">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 游戏时长 */}
            {gameDuration && (
              <div className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 mld-text" strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1 min-w-0">
                  <span className="text-xs font-medium shrink-0 mld-text">游戏时长：</span>
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium mld-bg">
                    {gameDuration}
                  </span>
                </div>
              </div>
            )}

            {/* 剧情标签 */}
            {storyTags.length > 0 && (
              <div className="flex items-start gap-2">
                <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0 mld-text" strokeWidth={2} />
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1 min-w-0">
                  <span className="text-xs font-medium shrink-0 mld-text">剧情标签：</span>
                  {storyTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium mld-bg">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* VNDB 链接 */}
            {vndbId && (
              <div className="flex items-start gap-2">
                <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 mld-text" strokeWidth={2} />
                <div className="flex items-center gap-x-1 min-w-0">
                  <span className="text-xs font-medium shrink-0 mld-text">VNDB：</span>
                  <a
                    href={`https://vndb.org/v${vndbId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium transition-all hover:opacity-80 mld-bg"
                  >
                    v{vndbId}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}