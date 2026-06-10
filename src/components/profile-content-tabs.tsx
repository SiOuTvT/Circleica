"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { useEmotionalMessage, useEmotionalMessages } from "@/hooks/use-emotional-messages"
import { apiGet } from "@/lib/api-client"
import { Calendar, Eye, FolderHeart, Gamepad2, Lock, MessageSquare, Plus, Trash2, Unlock, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

interface GameLite {
  id: string
  serialId?: number
  title: string
  coverImage?: string
  isNsfw?: boolean
  originalWork?: string
}

interface CommentLite {
  id: string
  content: string
  createdAt: Date
  game: { id: string; serialId?: number; title: string }
}

interface CollectionData {
  id: string
  name: string
  description: string
  isDefault: boolean
  sortOrder: number
  favorites: { game: GameLite }[]
}

interface Props {
  favGames: GameLite[]
  playStatusGames: { game: GameLite; status: string }[]
  comments: CommentLite[]
}

type TabKey = "favorites" | "comments" | "play"

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "favorites", label: "收藏", icon: FolderHeart },
  { key: "comments", label: "评论", icon: MessageSquare },
  { key: "play", label: "足迹", icon: Gamepad2 },
]

export function ProfileContentTabs({ favGames, playStatusGames, comments }: Props) {
  const [active, setActive] = useState<TabKey>("favorites")

  // Collections loaded from DB API
  const [collections, setCollections] = useState<CollectionData[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(true)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [modalCollection, setModalCollection] = useState<CollectionData | null>(null)

  // Load collections from API
  const loadCollections = useCallback(async () => {
    try {
      const data = await apiGet<{ collections: CollectionData[]; ungroupedCount: number; totalFavorites: number }>("/api/collections")
      setCollections(data.collections ?? [])
    } catch {
      // fallback: show default folder with all favGames
    } finally {
      setCollectionsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  const handleCreateCollection = async () => {
    const name = newFolderName.trim()
    if (!name) return
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        await loadCollections()
        setNewFolderName("")
        setShowCreateFolder(false)
      }
    } catch { /* ignore */ }
  }

  const handleDeleteCollection = async (id: string) => {
    try {
      await fetch(`/api/collections/${id}`, { method: "DELETE" })
      await loadCollections()
    } catch { /* ignore */ }
  }

  // Build display: default folder + DB collections
  const defaultFolderGames = favGames.filter(g => {
    // Game is in default if not in any DB collection
    const inCollection = collections.some(c => c.favorites?.some(f => f.game.id === g.id))
    return !inCollection
  })

  // Modal
  useBodyScrollLock(!!modalCollection)

  return (
    <div className="flex flex-col">
      {/* Tab 导航条 — sticky 置顶 */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-4 pt-4 pb-2 sm:px-5 sm:pt-5"
        style={{ borderBottom: "1px solid var(--border, rgba(128,128,128,0.15))" }}>
        <div className="flex gap-1 rounded-xl p-1"
          style={{ backgroundColor: "var(--tab-trough)" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = active === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className="relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ease-out"
                style={{
                  backgroundColor: isActive ? "var(--tab-active)" : "transparent",
                  color: isActive ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)" : "none",
                  fontWeight: isActive ? 700 : 500,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--tab-hover-text)" }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--tab-inactive-text)" }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {tab.label}
                {tab.key === "comments" && comments.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary leading-none">
                    {comments.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab 内容滚动区 — 局部独立滚动 */}
      <div className="p-4 sm:p-5 profile-scroll-area">
        {active === "favorites" && (
          <FavoritesTab
            defaultFolderGames={defaultFolderGames}
            collections={collections}
            favGames={favGames}
            onOpenFolder={(col) => setModalCollection(col)}
            showCreateFolder={showCreateFolder}
            setShowCreateFolder={setShowCreateFolder}
            newFolderName={newFolderName}
            setNewFolderName={setNewFolderName}
            onCreateFolder={handleCreateCollection}
            onDeleteFolder={handleDeleteCollection}
            loading={collectionsLoading}
          />
        )}
        {active === "comments" && <CommentsTab comments={comments} />}
        {active === "play" && <PlayTab playStatusGames={playStatusGames} />}
      </div>

      {/* 收藏夹详情弹窗 */}
      {modalCollection && (
        <FolderModal
          name={modalCollection.name}
          games={modalCollection.favorites?.map(f => f.game) ?? []}
          onClose={() => setModalCollection(null)}
        />
      )}
    </div>
  )
}

/* ==================== 收藏夹 Tab ==================== */
function FavoritesTab({
  defaultFolderGames,
  collections,
  favGames,
  onOpenFolder,
  showCreateFolder,
  setShowCreateFolder,
  newFolderName,
  setNewFolderName,
  onCreateFolder,
  onDeleteFolder,
  loading,
}: {
  defaultFolderGames: GameLite[]
  collections: CollectionData[]
  favGames: GameLite[]
  onOpenFolder: (col: CollectionData) => void
  showCreateFolder: boolean
  setShowCreateFolder: (v: boolean) => void
  newFolderName: string
  setNewFolderName: (v: string) => void
  onCreateFolder: () => void
  onDeleteFolder: (id: string) => void
  loading: boolean
}) {
  const { messages: favMsgs } = useEmotionalMessages(["empty_favorites", "empty_play_status"])
  return (
    <div className="space-y-3">
      {/* 创建新收藏夹 */}
      {showCreateFolder ? (
        <div className="rounded-xl bg-secondary/50 p-4 ring-1 ring-border">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="收藏夹名称"
            className="mb-3 w-full rounded-lg bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/40 transition-shadow"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") onCreateFolder() }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCreateFolder(false); setNewFolderName("") }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              取消
            </button>
            <button
              onClick={onCreateFolder}
              disabled={!newFolderName.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              创建
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreateFolder(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-secondary/20 px-4 py-3.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          创建新收藏夹
        </button>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* 默认收藏夹 */}
          <CollectionCard
            id="default"
            name="默认收藏夹"
            gameCount={defaultFolderGames.length}
            coverGames={defaultFolderGames}
            onOpen={() => onOpenFolder({ id: "default", name: "默认收藏夹", description: "", isDefault: true, sortOrder: 0, favorites: defaultFolderGames.map(g => ({ game: g })) })}
            isDefault
          />

          {/* DB 收藏夹 */}
          {collections.map((col) => (
            <CollectionCard
              key={col.id}
              id={col.id}
              name={col.name}
              gameCount={col.favorites?.length ?? 0}
              coverGames={col.favorites?.map(f => f.game) ?? []}
              onOpen={() => onOpenFolder(col)}
              onDelete={() => onDeleteFolder(col.id)}
            />
          ))}
        </>
      )}

      {(defaultFolderGames.length === 0 && collections.length === 0 && !loading && !showCreateFolder) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderHeart className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{favMsgs.empty_favorites ? `${favMsgs.empty_favorites.emoji} ${favMsgs.empty_favorites.title}，${favMsgs.empty_favorites.subtitle}` : "还没有收藏夹"}</p>
        </div>
      )}
    </div>
  )
}

function CollectionCard({ id, name, gameCount, coverGames, onOpen, onDelete, isDefault }: {
  id: string
  name: string
  gameCount: number
  coverGames: GameLite[]
  onOpen: () => void
  onDelete?: () => void
  isDefault?: boolean
}) {
  return (
    <div className="group w-full rounded-xl bg-secondary/40 p-4 transition-all hover:bg-secondary/60">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onOpen} className="flex items-center gap-2.5 min-w-0 text-left">
          <FolderHeart className="h-5 w-5 text-primary/80 shrink-0" strokeWidth={2} />
          <span className="text-sm font-semibold text-foreground truncate">{name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
            {gameCount} 部
          </span>
        </button>
        {!isDefault && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500"
            title="删除收藏夹"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <button onClick={onOpen} className="w-full text-left">
        {gameCount > 0 ? (
          <div className="flex gap-1.5 overflow-hidden">
            {coverGames.slice(0, 5).map((g) => (
              <div key={g.id} className="h-16 w-12 shrink-0 overflow-hidden rounded-md">
                {g.coverImage ? (
                  <Image src={g.coverImage} alt={g.title} width={48} height={64} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                    <FolderHeart className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {gameCount > 5 && (
              <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                +{gameCount - 5}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">空收藏夹 · 点击查看详情</p>
        )}
      </button>
    </div>
  )
}

/* ==================== 收藏夹弹窗（毛玻璃） ==================== */
function FolderModal({ name, games, onClose }: { name: string; games: GameLite[]; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null)

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{
        backgroundColor: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.65)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25), 0 8px 20px rgba(0,0,0,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          animation: "slideUp 0.25s ease-out",
        }}
      >
        {/* 暗色模式适配 */}
        <style>{`
          .dark .folder-modal-content { background: rgba(24,24,27,0.75) !important; border-color: rgba(255,255,255,0.08) !important; }
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        `}</style>

        <div className="folder-modal-content">
          {/* 弹窗头部 */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <FolderHeart className="h-5 w-5 text-primary" strokeWidth={2} />
              <h2 className="text-base font-bold text-foreground">{name}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {games.length} 部
              </span>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* 游戏网格 — 独立滚动 */}
          <div className="flex-1 overflow-y-auto p-5 folder-scroll-area" style={{ maxHeight: "calc(80vh - 72px)" }}>
            {games.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderHeart className="h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">这个收藏夹还是空的</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {games.map((g) => (
                  <Link key={g.id} href={`/games/${g.serialId ?? g.id}`} className="group" onClick={onClose}>
                    {g.coverImage ? (
                      <Image
                        src={g.coverImage}
                        alt={g.title}
                        width={120}
                        height={160}
                        className="aspect-[3/4] w-full rounded-lg object-cover transition-transform group-hover:scale-[1.03]"
                        unoptimized
                      />
                    ) : (
                      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FolderHeart className="h-6 w-6" />
                      </div>
                    )}
                    <p className="mt-1.5 text-[11px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {g.title}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==================== 评论 Tab ==================== */
function CommentsTab({ comments }: { comments: CommentLite[] }) {
  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">还没有发表评论</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      {comments.map((c) => (
        <Link
          key={c.id}
          href={`/games/${c.game.serialId ?? c.game.id}`}
          className="group rounded-xl bg-secondary/40 p-3.5 transition-colors hover:bg-secondary/70"
        >
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1.5">
            <span className="font-medium text-foreground group-hover:text-primary transition-colors">{c.game.title}</span>
            <span>·</span>
            <Calendar className="h-3 w-3" />
            <span>{new Date(c.createdAt).toLocaleDateString("zh-CN")}</span>
          </div>
          <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">{c.content}</p>
        </Link>
      ))}
    </div>
  )
}

/* ==================== 足迹空状态 ==================== */
function EmptyPlayStatus() {
  const { message: playMsg } = useEmotionalMessage("empty_play_status")
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Eye className="h-10 w-10 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">{playMsg ? `${playMsg.emoji} ${playMsg.title}，${playMsg.subtitle}` : "还没有游玩记录"}</p>
    </div>
  )
}

/* ==================== 足迹 Tab ==================== */
function PlayTab({ playStatusGames }: { playStatusGames: { game: GameLite; status: string }[] }) {
  if (playStatusGames.length === 0) {
    return (
      <EmptyPlayStatus />
    )
  }

  const statusColors: Record<string, string> = {
    "想玩": "bg-sky-500/10 text-sky-400",
    "在玩": "bg-amber-500/10 text-amber-400",
    "玩过": "bg-emerald-500/10 text-emerald-400",
    "搁置": "bg-muted-foreground/10 text-muted-foreground",
    "弃坑": "bg-rose-500/10 text-rose-400",
  }

  return (
    <div className="flex flex-col gap-2">
      {playStatusGames.map(({ game, status }) => (
        <Link key={game.id} href={`/games/${game.serialId ?? game.id}`} className="group flex items-center gap-3 rounded-xl bg-secondary/40 p-3 transition-colors hover:bg-secondary/70">
          {game.coverImage ? (
            <Image src={game.coverImage} alt={game.title} width={36} height={48} className="h-12 w-9 rounded-md object-cover" unoptimized />
          ) : (
            <div className="flex h-12 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Gamepad2 className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{game.title}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[status] || "bg-muted text-muted-foreground"}`}>
            {status}
          </span>
        </Link>
      ))}
    </div>
  )
}