"use client"

import { BookOpen, Building2, Calendar, Clock, Download, ExternalLink, Eye, Gamepad2, Heart, Monitor } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { CommentSection } from "./comment-section"

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

export function GameDetailClient({
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

  async function toggleFav() {
    if (!isLoggedIn) return
    const res = await fetch(`/api/games/${gameId}/favorite`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      setFav(data.isFav)
      setFavCnt(data.count)
    }
  }

  // Split gameTags by category (use tag.color to differentiate)
  const genreTags = gameTags?.filter(t => t.color === "#818cf8" || t.color === "#a78bfa") ?? [] // 紫色系
  const storyTags = gameTags?.filter(t => t.color === "#38bdf8" || t.color === "#22d3ee") ?? [] // 蓝色系

  return (
    <div>
      {/* ══════ 档案卡片 — 嵌入在 Tab 栏右侧 ══════ */}
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        
        {/* ─── 左侧: Tab 导航 (带滑块) ─── */}
        <div className="flex-1 min-w-0">
          <div ref={containerRef}
            className="relative inline-flex gap-1 rounded-xl p-1"
            style={{ backgroundColor: "var(--tab-trough)" }}>
            {/* 滑块 */}
            <div ref={sliderRef}
              className="absolute top-1 left-0 h-[calc(100%-8px)] rounded-lg transition-all duration-300 ease-out"
              style={{
                backgroundColor: "var(--tab-active)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)",
              }}
            />
            {TABS.map((t) => (
              <button
                key={t.key}
                data-tab-btn
                onClick={() => setTab(t.key)}
                className="relative z-10 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-300"
                style={{
                  color: tab === t.key ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
                  fontWeight: tab === t.key ? 700 : 500,
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
              <div>
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
              <div className="space-y-5">
                {downloadLinks.length > 0 ? (
                  <div className="space-y-2">
                    {downloadLinks.map((dl, i) => (
                      <a
                        key={i}
                        href={dl.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "var(--clr-blue)" }}
                      >
                        <Download className="w-4 h-4" strokeWidth={2.5} />
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
              <CommentSection
                gameId={gameId}
                comments={comments}
                isLoggedIn={isLoggedIn}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>

        {/* ─── 右侧: 档案卡片 (仅桌面端显示) ─── */}
        <div className="hidden lg:block w-[280px] shrink-0 rounded-2xl p-5 space-y-4"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}>
          
          {/* 发售日期 */}
          {releaseDate && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Calendar className="h-3 w-3" strokeWidth={2} />
                发售日期
              </div>
              <p className="text-sm font-bold text-foreground">{releaseDate}</p>
            </div>
          )}

          {/* 制作会社 */}
          {studioName && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Building2 className="h-3 w-3" strokeWidth={2} />
                制作会社
              </div>
              <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>
                {studioName}
              </span>
            </div>
          )}

          {/* 支持平台 */}
          {platformTags && platformTags.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Monitor className="h-3 w-3" strokeWidth={2} />
                支持平台
              </div>
              <div className="flex flex-wrap gap-1.5">
                {platformTags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium"
                    style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 游戏类型 */}
          {genreTags.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Gamepad2 className="h-3 w-3" strokeWidth={2} />
                游戏类型
              </div>
              <div className="flex flex-wrap gap-1.5">
                {genreTags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium"
                    style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 游戏时长 */}
          {gameDuration && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Clock className="h-3 w-3" strokeWidth={2} />
                游戏时长
              </div>
              <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>
                {gameDuration}
              </span>
            </div>
          )}

          {/* 剧情标签 */}
          {storyTags.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <BookOpen className="h-3 w-3" strokeWidth={2} />
                剧情标签
              </div>
              <div className="flex flex-wrap gap-1.5">
                {storyTags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium"
                    style={{ background: "rgba(56,189,248,0.12)", color: "#38bdf8" }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 语言 */}
          {languageTags && languageTags.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                语言
              </div>
              <div className="flex flex-wrap gap-1.5">
                {languageTags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium"
                    style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* VNDB 链接 */}
          {vndbId && (
            <a
              href={`https://vndb.org/v${vndbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
            >
              <ExternalLink className="h-3 w-3" strokeWidth={2} />
              VNDB v{vndbId}
            </a>
          )}

          {/* 人气数据 */}
          <div className="border-t pt-3 space-y-2" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                浏览
              </span>
              <span className="text-sm font-bold text-foreground">{viewCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Download className="h-3.5 w-3.5" strokeWidth={2} />
                下载
              </span>
              <span className="text-sm font-bold text-foreground">{downloadCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Heart className="h-3.5 w-3.5" strokeWidth={2} />
                收藏
              </span>
              <span className="text-sm font-bold text-foreground">{favCnt}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}