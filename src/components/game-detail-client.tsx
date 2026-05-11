"use client"

import { Download, Heart } from "lucide-react"
import { useState } from "react"
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

const roleMap: Record<string, string> = {
  scenario: "脚本",
  art: "原画",
  chardesign: "角色设计",
  director: "导演",
  music: "音乐",
  songs: "主题曲",
}

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
}) {
  const [tab, setTab] = useState<"intro" | "resource" | "comments">("intro")
  const [fav, setFav] = useState(isFav)
  const [favCnt, setFavCnt] = useState(favCount)

  async function toggleFav() {
    if (!isLoggedIn) return
    const res = await fetch(`/api/games/${gameId}/favorite`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      setFav(data.isFav)
      setFavCnt(data.count)
    }
  }

  return (
    <div className="mt-6">
      {/* ─── Tab 导航 — 三按钮平分宽度, 选中 #80F3FF 下划线 ─── */}
      <div className="flex border-b border-border">
        {(
          [
            { key: "intro", label: "游戏简介" },
            { key: "resource", label: "游戏资源" },
            { key: "comments", label: "评论" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="relative flex-1 py-3 text-sm font-medium transition-colors"
            style={{
              color: tab === t.key ? "#80F3FF" : "hsl(var(--muted-foreground))",
            }}
          >
            {t.label}
            {tab === t.key && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                style={{ backgroundColor: "#80F3FF" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ─── 内容区 ─── */}
      <div className="pt-6">

        {/* ═══ 游戏简介 — 纯文字 + 截图画报式单列展示 ═══ */}
        {tab === "intro" && (
          <div className="space-y-6">
            {/* 简介文字 */}
            {description ? (
              <div
                className="text-sm leading-relaxed text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">暂无简介</p>
            )}

            {/* 截图 — 一行一张, 像画报一样往下滑 */}
            {screenshots.length > 0 && (
              <div className="flex flex-col gap-4">
                {screenshots.map((s, i) => (
                  <div
                    key={i}
                    className="w-full overflow-hidden rounded-xl"
                    style={{ border: "1px solid hsl(var(--border))" }}
                  >
                    <img
                      src={s}
                      alt={`截图 ${i + 1}`}
                      className="w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ 游戏资源 — 移动端显示下载按钮 + 收藏 ═══ */}
        {tab === "resource" && (
          <div className="space-y-5">
            {/* 下载链接 */}
            {downloadLinks.length > 0 ? (
              <div className="space-y-2">
                {downloadLinks.map((dl, i) => (
                  <a
                    key={i}
                    href={dl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#80F3FF" }}
                  >
                    <Download className="w-4 h-4" strokeWidth={2.5} />
                    {dl.label || "下载"}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无下载链接</p>
            )}

            {/* 收藏按钮 */}
            <button
              onClick={toggleFav}
              disabled={!isLoggedIn}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all disabled:opacity-50"
              style={{
                backgroundColor: fav ? "#80F3FF" : "hsl(var(--secondary))",
                color: fav ? "#000" : "hsl(var(--muted-foreground))",
              }}
            >
              <Heart
                className="w-4 h-4"
                strokeWidth={2}
                fill={fav ? "#000" : "none"}
              />
              {fav ? "已收藏" : "收藏"} ({favCnt})
            </button>

            {/* 制作人员 */}
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
                        <img
                          src={c.avatar}
                          alt={c.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{
                            background: "linear-gradient(135deg, #C8F2E4, #7EDCBA)",
                          }}
                        >
                          {(c.nameJa || c.name)[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {c.nameJa || c.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {roleMap[c.role] ?? c.role}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ 评论 ═══ */}
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
  )
}