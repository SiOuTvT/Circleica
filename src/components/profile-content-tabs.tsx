"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { useEmotionalMessages } from "@/hooks/use-emotional-messages"
import { apiGet, apiPost, apiDelete, apiPut } from "@/lib/api-client"
import { formatDate } from "@/lib/date"
import { Calendar, FolderHeart, Loader2, MessageSquare, Plus, Share2, Trash2, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { Tag } from "@/components/ui/tag"
import { Badge } from "@/components/ui/badge"
import { UserActivityTimeline, type ActivityItemData } from "@/components/user-activity-timeline"
import { cn } from "@/lib/utils"

interface GameLite {
  id: string; serialId?: number; title: string; coverImage?: string; isNsfw?: boolean; originalWork?: string
}
interface CommentLite {
  id: string; content: string; createdAt: Date
  // game 可能为 null（游戏被删除后外键未级联清理），渲染时必须判空，否则 c.game.serialId 抛错
  game: { id: string; serialId?: number; title: string } | null
}
interface CollectionData {
  id: string; name: string; description: string; isDefault: boolean; sortOrder: number; isPublic: boolean; shareId: string | null; favorites: { game: GameLite }[]
}
interface Props {
  userId: string
  /** 是否本人浏览自己的主页（仅本人可见"下载"tab，保护下载隐私） */
  isSelf?: boolean
}
type TabKey = "favorites" | "comments" | "reserved"

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "favorites", label: "收藏", icon: FolderHeart },
  { key: "comments", label: "评论", icon: MessageSquare },
  { key: "reserved", label: "更多", icon: Plus },
]

// 情感消息 key 常量，避免每次渲染传入新数组
const FAV_MSG_KEYS: string[] = ["empty_favorites"]

export function ProfileContentTabs({ userId, isSelf }: Props) {
  const [active, setActive] = useState<TabKey>("favorites")
  const [collections, setCollections] = useState<CollectionData[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(true)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [modalCollection, setModalCollection] = useState<CollectionData | null>(null)
  const [creating, setCreating] = useState(false)
  const [, setLoadError] = useState(false)

  // 客户端按需加载数据 - 初始为空
  const [loadedFav, setLoadedFav] = useState(false)
  const [loadedComments, setLoadedComments] = useState(false)
  const [localFav, setLocalFav] = useState<GameLite[]>([])
  const [localComments, setLocalComments] = useState<CommentLite[]>([])
  // 用户动态时间轴（右侧竖条）
  const [activities, setActivities] = useState<ActivityItemData[]>([])
  const [loadedActivity, setLoadedActivity] = useState(false)
  // 各 tab 的分页状态
  const [favNextPage, setFavNextPage] = useState<number | null>(null)
  const [favHasMore, setFavHasMore] = useState(false)
  const [favLoadingMore, setFavLoadingMore] = useState(false)
  const [commentNextPage, setCommentNextPage] = useState<number | null>(null)
  const [commentHasMore, setCommentHasMore] = useState(false)
  const [commentLoadingMore, setCommentLoadingMore] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const loadFavorites = useCallback(async () => {
    if (loadedFav) return
    try {
      // API 返回 { items: Favorite[], hasMore, nextPage, total }（每项含嵌套 game），需提取 game 并过滤孤儿
      const data = await apiGet<{ success: boolean; data: { items: { id: string; game: GameLite | null }[]; hasMore: boolean; nextPage: number | null } }>(`/api/profile/${userId}/favorites?page=1`)
      const games = Array.isArray(data.data?.items)
        ? data.data.items.map((f) => f.game).filter((g): g is GameLite => g !== null)
        : []
      setLocalFav(games)
      setFavNextPage(data.data?.nextPage ?? null)
      setFavHasMore(data.data?.hasMore ?? false)
      setLoadedFav(true)
    } catch { setLoadError(true) }
  }, [userId, loadedFav])

  const loadMoreFavorites = useCallback(async () => {
    if (!favNextPage || favLoadingMore) return
    setFavLoadingMore(true)
    try {
      const data = await apiGet<{ success: boolean; data: { items: { id: string; game: GameLite | null }[]; hasMore: boolean; nextPage: number | null } }>(`/api/profile/${userId}/favorites?page=${favNextPage}`)
      const games = Array.isArray(data.data?.items)
        ? data.data.items.map((f) => f.game).filter((g): g is GameLite => g !== null)
        : []
      setLocalFav(prev => [...prev, ...games])
      setFavNextPage(data.data?.nextPage ?? null)
      setFavHasMore(data.data?.hasMore ?? false)
    } catch { setLoadError(true) } finally { setFavLoadingMore(false) }
  }, [userId, favNextPage, favLoadingMore])

  const loadComments = useCallback(async () => {
    if (loadedComments) return
    try {
      const data = await apiGet<{ success: boolean; data: { items: CommentLite[]; hasMore: boolean; nextPage: number | null } }>(`/api/profile/${userId}/comments?page=1`)
      setLocalComments(Array.isArray(data.data?.items) ? data.data.items : [])
      setCommentNextPage(data.data?.nextPage ?? null)
      setCommentHasMore(data.data?.hasMore ?? false)
      setLoadedComments(true)
    } catch { setLoadError(true) }
  }, [userId, loadedComments])

  const loadMoreComments = useCallback(async () => {
    if (!commentNextPage || commentLoadingMore) return
    setCommentLoadingMore(true)
    try {
      const data = await apiGet<{ success: boolean; data: { items: CommentLite[]; hasMore: boolean; nextPage: number | null } }>(`/api/profile/${userId}/comments?page=${commentNextPage}`)
      setLocalComments(prev => [...prev, ...(Array.isArray(data.data?.items) ? data.data.items : [])])
      setCommentNextPage(data.data?.nextPage ?? null)
      setCommentHasMore(data.data?.hasMore ?? false)
    } catch { setLoadError(true) } finally { setCommentLoadingMore(false) }
  }, [userId, commentNextPage, commentLoadingMore])

  const loadActivity = useCallback(async () => {
    if (loadedActivity) return
    try {
      const data = await apiGet<{ success: boolean; data: ActivityItemData[] }>(`/api/profile/${userId}/activities?page=1`)
      const list = Array.isArray(data.data) ? data.data : []
      setActivities(list)
    } catch {
      setActivities([])
    } finally {
      setLoadedActivity(true)
    }
  }, [userId, loadedActivity])

  // 动态时间轴默认加载（右侧竖条常驻，不依赖 Tab 切换）
  useEffect(() => { loadActivity() }, [loadActivity])

  // 切换 tab 时加载对应数据
  useEffect(() => {
    if (active === "favorites") loadFavorites()
    else if (active === "comments") loadComments()
  }, [active, loadFavorites, loadComments])

  const loadCollections = useCallback(async () => {
    setLoadError(false)
    try {
      const data = await apiGet<{ success: boolean; data: CollectionData[] }>("/api/collections")
      setCollections(Array.isArray(data.data) ? data.data : [])
    } catch { setLoadError(true) }
    finally { setCollectionsLoading(false) }
  }, [])

  // 收藏夹是"当前登录用户"的私有数据，仅在浏览自己主页时加载：
  // 1) 游客/他人主页不再对 /api/collections 发起请求，消除全站 401 噪音（审计发现）；
  // 2) 非本人浏览时不会把访客自己的私有收藏夹渲染进对方主页（隐私泄露）。
  useEffect(() => {
    if (isSelf) loadCollections()
    else setCollectionsLoading(false)
  }, [isSelf, loadCollections])

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
      toast.error("创建收藏夹失败，请重试")
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteCollection(id: string) {
    try { await apiDelete(`/api/collections/${id}`); await loadCollections() } catch { toast.error("删除失败，请重试") }
  }

  // 收藏夹公开 / 私有切换
  async function handleToggleCollectionPublic(col: CollectionData, makePublic: boolean) {
    try {
      await apiPut(`/api/collections/${col.id}`, { isPublic: makePublic })
      setCollections((prev) => prev.map((c) => (c.id === col.id ? { ...c, isPublic: makePublic } : c)))
      toast.success(makePublic ? "已公开，可分享链接" : "已设为私有")
    } catch { toast.error("操作失败，请重试") }
  }

  // 复制收藏夹公开分享链接
  async function handleShareCollection(col: CollectionData) {
    if (!col.shareId) return
    const url = `${window.location.origin}/lists/${col.shareId}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("分享链接已复制到剪贴板")
    } catch {
      toast.error("复制失败，请手动复制：" + url)
    }
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
    <div className="flex flex-col lg:flex-row lg:items-stretch">
      {/* 左栏：Tab 切换区域（贴壁） */}
      <section className="flex min-w-0 flex-1 flex-col lg:border-r lg:border-border">
        <div className="sticky top-0 z-10 bg-card px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
          <div className="flex gap-2 rounded-xl px-1 py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon; const isActive = active === tab.key
              return (
                <button key={tab.key} onClick={() => setActive(tab.key)}
                  className={cn(
                    "relative flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition-all duration-300 ease-out sm:min-h-[36px]",
                    isActive
                      ? "bg-[var(--tab-active)] text-[var(--tab-active-text)] font-bold"
                      : "bg-transparent text-[var(--tab-inactive-text)] font-medium"
                  )}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  {tab.label}
                  {tab.key === "comments" && localComments.length > 0 && <Badge variant="default" size="sm">{localComments.length}</Badge>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-5 profile-scroll-area">
          {active === "favorites" && (
            <FavoritesTab defaultFolderGames={defaultFolderGames} collections={collections} isSelf={isSelf ?? false}
              onOpenFolder={(col) => setModalCollection(col)}
              showCreateFolder={showCreateFolder} setShowCreateFolder={setShowCreateFolder}
              newFolderName={newFolderName} setNewFolderName={setNewFolderName}
              onCreateFolder={handleCreateCollection} onDeleteFolder={handleDeleteCollection}
              onTogglePublic={handleToggleCollectionPublic} onShare={handleShareCollection}
              loading={collectionsLoading ?? false} creating={creating}
              hasMore={favHasMore} loadingMore={favLoadingMore} onLoadMore={loadMoreFavorites} />
          )}
          {active === "comments" && (
            loadedComments ? <CommentsTab comments={localComments} hasMore={commentHasMore} loadingMore={commentLoadingMore} onLoadMore={loadMoreComments} /> : <TabLoadingSkeleton />
          )}
          {/* 第三个 Tab：预留占位框架，暂不填充内容 */}
          {active === "reserved" && (
            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground/60">敬请期待</div>
          )}
        </div>
      </section>

      {/* 右栏：通高独立动态流区域，中间细分隔竖线由左栏 border-r 提供，无外框 */}
      <aside className="w-full shrink-0 lg:w-[240px]">
        <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <h3 className="text-sm font-semibold text-foreground">动态</h3>
        </div>
        <div className="profile-scroll-area max-h-[calc(100vh-12rem)] overflow-y-auto px-3 py-2 pb-6">
          {loadedActivity ? (
            <UserActivityTimeline items={activities} />
          ) : (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          )}
        </div>
      </aside>

      {/* 收藏夹弹窗 - 用 portal 渲染到 body，脱离 layout-wrapper 的 translateX 容器，
          否则 fixed 会被 transform 捕获定位、z-50 困在内部 stacking context 盖不住侧栏 */}
      {mounted && createPortal(
        <div inert={!modalCollection} aria-hidden={!modalCollection} className={`fixed inset-0 z-[100] ${modalCollection ? "" : "pointer-events-none"}`}>
          <div className={`absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300 cursor-pointer ${modalCollection ? "opacity-100" : "opacity-0"}`} onClick={() => setModalCollection(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
            <div className={`relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-clip rounded-2xl bg-card border border-border shadow-4 transition-all duration-300 ${modalCollection ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}`}>
              {modalCollection && (
                <FolderModalContent
                  name={modalCollection.name}
                  games={modalCollection.favorites?.map(f => f.game) ?? []}
                  onClose={() => setModalCollection(null)}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function LoadMoreButton({ hasMore, loading, onLoadMore, label = "加载更多" }: { hasMore: boolean; loading: boolean; onLoadMore: () => void; label?: string }) {
  if (!hasMore) return null
  return (
    <div className="flex justify-center pt-2">
      <button onClick={onLoadMore} disabled={loading} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50">
        {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />加载中…</> : label}
      </button>
    </div>
  )
}

function FavoritesTab({ defaultFolderGames, collections, isSelf, onOpenFolder, showCreateFolder, setShowCreateFolder, newFolderName, setNewFolderName, onCreateFolder, onDeleteFolder, onTogglePublic, onShare, loading, creating, hasMore, loadingMore, onLoadMore }: {
  defaultFolderGames: GameLite[]; collections: CollectionData[]; isSelf: boolean; onOpenFolder: (col: CollectionData) => void
  showCreateFolder: boolean; setShowCreateFolder: (v: boolean) => void; newFolderName: string; setNewFolderName: (v: string) => void
  onCreateFolder: () => void; onDeleteFolder: (id: string) => void; onTogglePublic: (col: CollectionData, makePublic: boolean) => void; onShare: (col: CollectionData) => void; loading: boolean; creating: boolean
  hasMore?: boolean; loadingMore?: boolean; onLoadMore?: () => void
}) {
  const { messages: favMsgs } = useEmotionalMessages(FAV_MSG_KEYS)

  return (
    <div className="space-y-3">
      {/* 收藏夹管理（新建/删除）是本人专属功能，他人主页只读展示对方公开收藏 */}
      {isSelf && (showCreateFolder ? (
        <div className="rounded-xl bg-secondary/50 p-4 ring-1 ring-border">
          <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="收藏夹名称" className="mb-3 w-full rounded-lg border-2 border-input bg-transparent px-3 py-2.5 text-[15px] text-foreground outline-none transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter,border-radius] duration-300 ease-out focus:rounded-none focus:border-primary"
            autoFocus onKeyDown={(e) => { if (e.key === "Enter") onCreateFolder() }} />
          <div className="flex gap-2">
            <button onClick={() => { setShowCreateFolder(false); setNewFolderName("") }} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary">取消</button>
            <button onClick={onCreateFolder} disabled={!newFolderName.trim() || creating} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 shadow-1">{creating ? "创建中..." : "创建"}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowCreateFolder(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary/20 px-4 py-3.5 text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors">
          <Plus className="h-4 w-4" strokeWidth={2} />创建新收藏夹
        </button>
      ))}

      {loading ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : <>
        <CollectionCard name="默认收藏夹" gameCount={defaultFolderGames.length} coverGames={defaultFolderGames}
          onOpen={() => onOpenFolder({ id: "default", name: "默认收藏夹", description: "", isDefault: true, sortOrder: 0, isPublic: false, shareId: null, favorites: defaultFolderGames.map(g => ({ game: g })) })} isDefault />
        {isSelf && collections.map((col) => (
          <CollectionCard key={col.id} name={col.name} gameCount={col.favorites?.length ?? 0} coverGames={col.favorites?.map(f => f.game) ?? []}
            onOpen={() => onOpenFolder(col)} onDelete={() => onDeleteFolder(col.id)}
            isPublic={col.isPublic} shareId={col.shareId} showControls={isSelf}
            onShare={() => onShare(col)} onTogglePublic={(v) => onTogglePublic(col, v)} />
        ))}
      </>}

      {defaultFolderGames.length === 0 && collections.length === 0 && !loading && !showCreateFolder && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderHeart className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {favMsgs.empty_favorites ? <>{favMsgs.empty_favorites.title}，{favMsgs.empty_favorites.subtitle}</> : "还没有收藏夹"}
          </p>
        </div>
      )}
      <LoadMoreButton hasMore={!!hasMore} loading={!!loadingMore} onLoadMore={() => onLoadMore?.()} />
    </div>
  )
}

function CollectionCard({ name, gameCount, coverGames, onOpen, onDelete, isDefault, isPublic, shareId, showControls, onShare, onTogglePublic }: {
  name: string; gameCount: number; coverGames: GameLite[]; onOpen: () => void; onDelete?: () => void; isDefault?: boolean
  isPublic?: boolean; shareId?: string | null; showControls?: boolean
  onShare?: () => void; onTogglePublic?: (makePublic: boolean) => void
}) {
  return (
    <div className="group w-full rounded-xl bg-secondary/40 p-4 hover:bg-secondary/60">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onOpen} className="flex items-center gap-2.5 min-w-0 text-left">
          <FolderHeart className="h-5 w-5 text-primary/80 shrink-0" strokeWidth={2} />
          <span className="text-sm font-semibold text-foreground truncate">{name}</span>
          <Tag variant="badge" className="bg-muted text-muted-foreground">{gameCount} 部</Tag>
        </button>
        <div className="flex items-center gap-1">
          {showControls && !isDefault && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onTogglePublic?.(!isPublic) }}
                className={cn("flex items-center rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                  isPublic ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-secondary")}
                title={isPublic ? "已公开：点击设为私有" : "点击设为公开"}>
                {isPublic ? "公开" : "私有"}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onShare?.() }}
                className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary" title="复制分享链接">
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {!isDefault && onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500" title="删除收藏夹">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
            {gameCount > 5 && <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-micro font-bold text-muted-foreground">+{gameCount - 5}</div>}
          </div>
        ) : <p className="text-xs text-muted-foreground">空收藏夹，点击查看详情</p>}
      </button>
    </div>
  )
}

// 收藏夹弹窗内容组件 - 使用 memo 避免不必要的重渲染
const FolderModalContent = memo(function FolderModalContent({ name, games, onClose }: { name: string; games: GameLite[]; onClose: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <FolderHeart className="h-5 w-5 text-primary" strokeWidth={2} />
          <h2 className="text-base font-semibold text-foreground">{name}</h2>
          <Tag variant="badge" className="bg-muted text-muted-foreground">{games.length} 部</Tag>
        </div>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" strokeWidth={2} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 max-h-[calc(80vh-72px)]">
        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderHeart className="h-12 w-12 text-muted-foreground/20 mb-3" /><p className="text-sm text-muted-foreground">这个收藏夹还是空的</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {games.map((g) => (
              <Link key={g.id} href={`/games/${g.serialId ?? g.id}`} className="group" onClick={onClose}>
                {g.coverImage ? <Image src={g.coverImage} alt={g.title} width={120} height={160} className="aspect-[1/1] sm:aspect-[3/2] w-full rounded-lg object-cover" unoptimized />
                  : <div className="flex aspect-[1/1] sm:aspect-[3/2] w-full items-center justify-center rounded-lg bg-muted"><FolderHeart className="h-6 w-6" /></div>}
                <p className="mt-1.5 text-xs font-medium text-foreground truncate">{g.title}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
})

function CommentsTab({ comments, hasMore, loadingMore, onLoadMore }: { comments: CommentLite[]; hasMore?: boolean; loadingMore?: boolean; onLoadMore?: () => void }) {
  if (comments.length === 0) return <div className="flex flex-col items-center justify-center py-12 text-center"><MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" /><p className="text-sm text-muted-foreground">还没有发表评论</p></div>
  return (
    <div className="flex flex-col gap-2.5">
      {comments.map((c) => {
        const game = c.game
        const body = (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <span className="font-medium text-foreground transition-colors duration-200 group-hover:text-primary">{game ? game.title : "已删除的游戏"}</span><Calendar className="h-3 w-3 ml-3" /><span>{formatDate(c.createdAt)}</span>
            </div>
            <p className="text-sm text-foreground/80 line-clamp-2">{c.content}</p>
          </>
        )
        // 游戏已被删除（game 为 null）时不渲染跳转链接，避免悬空链接与崩溃
        return game ? (
          <Link key={c.id} href={`/games/${game.serialId ?? game.id}`} className="group rounded-xl bg-secondary/40 p-3.5 hover:bg-secondary/70">
            {body}
          </Link>
        ) : (
          <div key={c.id} className="rounded-xl bg-secondary/40 p-3.5 opacity-70">
            {body}
          </div>
        )
      })}
      <LoadMoreButton hasMore={!!hasMore} loading={!!loadingMore} onLoadMore={() => onLoadMore?.()} />
    </div>
  )
}

// 加载占位骨架屏
function TabLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-secondary/40 p-3.5 animate-pulse">
          <div className="h-3 w-1/3 rounded bg-muted-foreground/20 mb-2" />
          <div className="h-4 w-full rounded bg-muted-foreground/20" />
        </div>
      ))}
    </div>
  )
}

