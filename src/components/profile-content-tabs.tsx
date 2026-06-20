"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { useEmotionalMessage, useEmotionalMessages } from "@/hooks/use-emotional-messages"
import { apiGet, apiPost, apiDelete } from "@/lib/api-client"
import { Calendar, Eye, FolderHeart, Gamepad2, MessageSquare, Plus, Trash2, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

interface GameLite {
  id: string; serialId?: number; title: string; coverImage?: string; isNsfw?: boolean; originalWork?: string
}
interface CommentLite {
  id: string; content: string; createdAt: Date; game: { id: string; serialId?: number; title: string }
}
interface CollectionData {
  id: string; name: string; description: string; isDefault: boolean; sortOrder: number; favorites: { game: GameLite }[]
}
interface Props {
  favGames?: GameLite[]; playStatusGames?: { game: GameLite; status: string }[]; comments?: CommentLite[]
  userId: string
}
type TabKey = "favorites" | "comments" | "play"

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "favorites", label: "收藏", icon: FolderHeart },
  { key: "comments", label: "评论", icon: MessageSquare },
  { key: "play", label: "足迹", icon: Gamepad2 },
]

// 情感消息 key 常量，避免每次渲染传入新数组
const FAV_MSG_KEYS = ["empty_favorites", "empty_play_status"] as const
const PLAY_MSG_KEY = "empty_play_status" as const

export function ProfileContentTabs({ favGames = [], playStatusGames = [], comments = [], userId }: Props) {
  const [active, setActive] = useState<TabKey>("favorites")
  const [collections, setCollections] = useState<CollectionData[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(true)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [modalCollection, setModalCollection] = useState<CollectionData | null>(null)
  const [creating, setCreating] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // 客户端按需加载数据
  const [loadedFav, setLoadedFav] = useState(favGames.length > 0)
  const [loadedPlay, setLoadedPlay] = useState(playStatusGames.length > 0)
  const [loadedComments, setLoadedComments] = useState(comments.length > 0)
  const [localFav, setLocalFav] = useState<GameLite[]>(favGames)
  const [localPlay, setLocalPlay] = useState<{ game: GameLite; status: string }[]>(playStatusGames)
  const [localComments, setLocalComments] = useState<CommentLite[]>(comments)

  const loadFavorites = useCallback(async () => {
    if (loadedFav) return
    try {
      const data = await apiGet<{ success: boolean; data: { favorites: GameLite[] } }>(`/api/profile/${userId}/favorites`)
      setLocalFav(data.data?.favorites ?? [])
      setLoadedFav(true)
    } catch { setLoadError(true) }
  }, [userId, loadedFav])

  const loadPlayStatus = useCallback(async () => {
    if (loadedPlay) return
    try {
      const data = await apiGet<{ success: boolean; data: { playStatuses: { game: GameLite; status: string }[] } }>(`/api/profile/${userId}/play-status`)
      setLocalPlay(data.data?.playStatuses ?? [])
      setLoadedPlay(true)
    } catch { setLoadError(true) }
  }, [userId, loadedPlay])

  const loadComments = useCallback(async () => {
    if (loadedComments) return
    try {
      const data = await apiGet<{ success: boolean; data: { comments: CommentLite[] } }>(`/api/profile/${userId}/comments`)
      setLocalComments(data.data?.comments ?? [])
      setLoadedComments(true)
    } catch { setLoadError(true) }
  }, [userId, loadedComments])

  // 切换 tab 时加载对应数据
  useEffect(() => {
    if (active === "favorites") loadFavorites()
    else if (active === "play") loadPlayStatus()
    else if (active === "comments") loadComments()
  }, [active, loadFavorites, loadPlayStatus, loadComments])

  const loadCollections = useCallback(async () => {
    setLoadError(false)
    try {
      const data = await apiGet<{ success: boolean; data: { collections: CollectionData[] } }>("/api/collections")
      setCollections(data.data?.collections ?? [])
    } catch { setLoadError(true) }
    finally { setCollectionsLoading(false) }
  }, [])

  useEffect(() => { loadCollections() }, [loadCollections])

  async function handleCreateCollection() {
    const name = newFolderName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      await apiPost("/api/collections", { name })
      setNewFolderName("")
      setShowCreateFolder(false)
      await loadCollections()
    } catch {
      alert("创建收藏夹失败，请重试")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteCollection(id: string) {
    try { await apiDelete(`/api/collections/${id}`); await loadCollections() } catch { alert("删除失败，请重试") }
  }

  // 使用 Set 缓存已收藏 ID，将复杂度从 O(n*m) 降为 O(n)
  const defaultFolderGames = useMemo(() => {
    if (collections.length === 0) return localFav
    // 收集所有已在收藏夹中的游戏 ID
    const favoritedIds = new Set<string>()
    for (const collection of collections) {
      if (collection.favorites) {
        for (const fav of collection.favorites) {
          favoritedIds.add(fav.game.id)
        }
      }
    }
    // 过滤出默认收藏夹的游戏
    return localFav.filter(g => !favoritedIds.has(g.id))
  }, [localFav, collections])

  useBodyScrollLock(!!modalCollection)

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm px-4 pt-4 pb-2 sm:px-5 sm:pt-5"
        style={{ borderBottom: "1px solid var(--border, rgba(128,128,128,0.15))" }}>
        <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: "var(--tab-trough)" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon; const isActive = active === tab.key
            return (
              <button key={tab.key} onClick={() => setActive(tab.key)}
                className="relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ease-out"
                style={{ backgroundColor: isActive ? "var(--tab-active)" : "transparent", color: isActive ? "var(--tab-active-text)" : "var(--tab-inactive-text)", boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.12)" : "none", fontWeight: isActive ? 700 : 500 }}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {tab.label}
                {tab.key === "comments" && comments.length > 0 && <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary leading-none">{comments.length}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5 profile-scroll-area">
        {active === "favorites" && (
          <FavoritesTab defaultFolderGames={defaultFolderGames} collections={collections}
            onOpenFolder={(col) => setModalCollection(col)}
            showCreateFolder={showCreateFolder} setShowCreateFolder={setShowCreateFolder}
            newFolderName={newFolderName} setNewFolderName={setNewFolderName}
            onCreateFolder={handleCreateCollection} onDeleteFolder={handleDeleteCollection}
            loading={collectionsLoading} creating={creating} />
        )}
        {active === "comments" && <CommentsTab comments={comments} />}
        {active === "play" && <PlayTab playStatusGames={playStatusGames} />}
      </div>

      {modalCollection && createPortal(
        <FolderModal name={modalCollection.name} games={modalCollection.favorites?.map(f => f.game) ?? []} onClose={() => setModalCollection(null)} />,
        document.body
      )}
    </div>
  )
}

function FavoritesTab({ defaultFolderGames, collections, onOpenFolder, showCreateFolder, setShowCreateFolder, newFolderName, setNewFolderName, onCreateFolder, onDeleteFolder, loading, creating }: {
  defaultFolderGames: GameLite[]; collections: CollectionData[]; onOpenFolder: (col: CollectionData) => void
  showCreateFolder: boolean; setShowCreateFolder: (v: boolean) => void; newFolderName: string; setNewFolderName: (v: string) => void
  onCreateFolder: () => void; onDeleteFolder: (id: string) => void; loading: boolean; creating: boolean
}) {
  const { messages: favMsgs } = useEmotionalMessages(FAV_MSG_KEYS)

  return (
    <div className="space-y-3">
      {showCreateFolder ? (
        <div className="rounded-xl bg-secondary/50 p-4 ring-1 ring-border">
          <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="收藏夹名称" className="mb-3 w-full rounded-lg bg-background px-3 py-2.5 text-sm text-foreground outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/40"
            autoFocus onKeyDown={(e) => { if (e.key === "Enter") onCreateFolder() }} />
          <div className="flex gap-2">
            <button onClick={() => { setShowCreateFolder(false); setNewFolderName("") }} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">取消</button>
            <button onClick={onCreateFolder} disabled={!newFolderName.trim() || creating} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shadow-sm">{creating ? "创建中..." : "创建"}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowCreateFolder(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-secondary/20 px-4 py-3.5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
          <Plus className="h-4 w-4" strokeWidth={2.5} />创建新收藏夹
        </button>
      )}

      {loading ? <div className="flex items-center justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div> : <>
        <CollectionCard id="default" name="默认收藏夹" gameCount={defaultFolderGames.length} coverGames={defaultFolderGames}
          onOpen={() => onOpenFolder({ id: "default", name: "默认收藏夹", description: "", isDefault: true, sortOrder: 0, favorites: defaultFolderGames.map(g => ({ game: g })) })} isDefault />
        {collections.map((col) => (
          <CollectionCard key={col.id} id={col.id} name={col.name} gameCount={col.favorites?.length ?? 0} coverGames={col.favorites?.map(f => f.game) ?? []}
            onOpen={() => onOpenFolder(col)} onDelete={() => onDeleteFolder(col.id)} />
        ))}
      </>}

      {defaultFolderGames.length === 0 && collections.length === 0 && !loading && !showCreateFolder && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderHeart className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {favMsgs.empty_favorites ? `${favMsgs.empty_favorites.emoji} ${favMsgs.empty_favorites.title}，${favMsgs.empty_favorites.subtitle}` : "还没有收藏夹"}
          </p>
        </div>
      )}
    </div>
  )
}

function CollectionCard({ id, name, gameCount, coverGames, onOpen, onDelete, isDefault }: {
  id: string; name: string; gameCount: number; coverGames: GameLite[]; onOpen: () => void; onDelete?: () => void; isDefault?: boolean
}) {
  return (
    <div className="group w-full rounded-xl bg-secondary/40 p-4 hover:bg-secondary/60">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onOpen} className="flex items-center gap-2.5 min-w-0 text-left">
          <FolderHeart className="h-5 w-5 text-primary/80 shrink-0" strokeWidth={2} />
          <span className="text-sm font-semibold text-foreground truncate">{name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">{gameCount} 部</span>
        </button>
        {!isDefault && onDelete && (
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500" title="删除收藏夹">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <button onClick={onOpen} className="w-full text-left">
        {gameCount > 0 ? (
          <div className="flex gap-1.5 overflow-hidden">
            {coverGames.slice(0, 5).map((g) => (
              <div key={g.id} className="h-16 w-12 shrink-0 overflow-hidden rounded-md">
                {g.coverImage ? <Image src={g.coverImage} alt={g.title} width={48} height={64} className="h-full w-full object-cover" unoptimized />
                  : <div className="flex h-full w-full items-center justify-center bg-muted"><FolderHeart className="h-4 w-4" /></div>}
              </div>
            ))}
            {gameCount > 5 && <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">+{gameCount - 5}</div>}
          </div>
        ) : <p className="text-xs text-muted-foreground">空收藏夹 · 点击查看详情</p>}
      </button>
    </div>
  )
}

function FolderModal({ name, games, onClose }: { name: string; games: GameLite[]; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
      <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <FolderHeart className="h-5 w-5 text-primary" strokeWidth={2} />
            <h2 className="text-base font-bold text-foreground">{name}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{games.length} 部</span>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" strokeWidth={2.5} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5" style={{ maxHeight: "calc(80vh - 72px)" }}>
          {games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderHeart className="h-12 w-12 text-muted-foreground/20 mb-3" /><p className="text-sm text-muted-foreground">这个收藏夹还是空的</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {games.map((g) => (
                <Link key={g.id} href={`/games/${g.serialId ?? g.id}`} className="group" onClick={onClose}>
                  {g.coverImage ? <Image src={g.coverImage} alt={g.title} width={120} height={160} className="aspect-[3/4] w-full rounded-lg object-cover" unoptimized />
                    : <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-muted"><FolderHeart className="h-6 w-6" /></div>}
                  <p className="mt-1.5 text-[11px] font-medium text-foreground truncate">{g.title}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CommentsTab({ comments }: { comments: CommentLite[] }) {
  if (comments.length === 0) return <div className="flex flex-col items-center justify-center py-12 text-center"><MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">还没有发表评论</p></div>
  return (
    <div className="flex flex-col gap-2.5">
      {comments.map((c) => (
        <Link key={c.id} href={`/games/${c.game.serialId ?? c.game.id}`} className="group rounded-xl bg-secondary/40 p-3.5 hover:bg-secondary/70">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1.5">
            <span className="font-medium text-foreground group-hover:text-primary">{c.game.title}</span><span>·</span><Calendar className="h-3 w-3" /><span>{new Date(c.createdAt).toLocaleDateString("zh-CN")}</span>
          </div>
          <p className="text-sm text-foreground/80 line-clamp-2">{c.content}</p>
        </Link>
      ))}
    </div>
  )
}

function PlayTab({ playStatusGames }: { playStatusGames: { game: GameLite; status: string }[] }) {
  const { message: playMsg } = useEmotionalMessage(PLAY_MSG_KEY)
  if (playStatusGames.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Eye className="h-10 w-10 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">{playMsg ? `${playMsg.emoji} ${playMsg.title}，${playMsg.subtitle}` : "还没有游玩记录"}</p>
    </div>
  )
  const colors: Record<string, string> = { "想玩": "bg-sky-500/10 text-sky-400", "在玩": "bg-amber-500/10 text-amber-400", "玩过": "bg-emerald-500/10 text-emerald-400", "搁置": "bg-muted-foreground/10 text-muted-foreground", "弃坑": "bg-rose-500/10 text-rose-400" }
  return (
    <div className="flex flex-col gap-2">
      {playStatusGames.map(({ game, status }) => (
        <Link key={game.id} href={`/games/${game.serialId ?? game.id}`} className="group flex items-center gap-3 rounded-xl bg-secondary/40 p-3 hover:bg-secondary/70">
          {game.coverImage ? <Image src={game.coverImage} alt={game.title} width={36} height={48} className="h-12 w-9 rounded-md object-cover" unoptimized /> : <div className="flex h-12 w-9 items-center justify-center rounded-md bg-muted"><Gamepad2 className="h-4 w-4" /></div>}
          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{game.title}</p></div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[status] || "bg-muted text-muted-foreground"}`}>{status}</span>
        </Link>
      ))}
    </div>
  )
}