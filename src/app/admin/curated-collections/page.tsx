"use client"

import { Card } from "@/components/ui/card"
import { adminBtnPrimary, adminBtnDanger, adminInput } from "@/lib/admin-styles"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { GripVertical, Loader2, Pencil, Plus, Save, Search, Trash2, X, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api-client"

interface CollectionItem {
  id: string
  name: string
  description: string
  sortOrder: number
  published: boolean
  createdAt: string
  _count: { games: number }
}

interface GameItem {
  id: string
  serialId: number
  title: string
  coverImage: string
  studioName?: string
  releaseDate?: string
}

interface CollectionDetail extends CollectionItem {
  games: Array<{ sortOrder: number; game: GameItem }>
}

export default function CuratedCollectionsPage() {
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CollectionDetail | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchCollections = useCallback(async () => {
    try {
      const data = await api.get<{ data?: CollectionItem[] }>("/api/admin/curated-collections")
      setCollections(data.data || [])
    } catch {
      toast.error("加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCollections() }, [fetchCollections])

  async function handleCreate() {
    setEditing(null)
    setShowDialog(true)
  }

  async function handleEdit(id: string) {
    try {
      const data = await api.get<{ data?: CollectionDetail }>(`/api/admin/curated-collections/${id}`)
      setEditing(data.data ?? null)
      setShowDialog(true)
    } catch {
      toast.error("加载合集详情失败")
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await api.delete(`/api/admin/curated-collections/${deleteId}`)
      toast.success("已删除")
      setCollections(prev => prev.filter(c => c.id !== deleteId))
    } catch {
      toast.error("删除失败")
    }
    setDeleteId(null)
  }

  async function handleSaved() {
    setShowDialog(false)
    setEditing(null)
    setLoading(true)
    await fetchCollections()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        {[1, 2].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">精选合集</h1>
          <p className="text-sm text-muted-foreground mt-1">管理前台展示的精选游戏合集</p>
        </div>
        <button onClick={handleCreate} className={adminBtnPrimary}>
          <Plus className="h-4 w-4" /> 新建合集
        </button>
      </div>

      {collections.length === 0 ? (
        <Card className="p-12 text-center" style={{ borderRadius: "var(--radius-lg)" }}>
          <p className="text-muted-foreground">暂无合集，点击上方按钮创建第一个精选合集</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {collections.map(c => (
            <Card key={c.id} className="p-4 flex items-center gap-4" style={{ borderRadius: "var(--radius-lg)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                  {!c.published && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">未发布</span>
                  )}
                </div>
                {c.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{c.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">{c._count.games} 部游戏</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleEdit(c.id)} className={adminBtnPrimary.replace("px-4", "px-3")}>
                  <Pencil className="h-3.5 w-3.5" /> 编辑
                </button>
                <button onClick={() => setDeleteId(c.id)} className={adminBtnDanger}>
                  <Trash2 className="h-3.5 w-3.5" /> 删除
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showDialog && (
        <CollectionDialog
          collection={editing}
          onClose={() => { setShowDialog(false); setEditing(null) }}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="确认删除"
        description="删除后不可恢复，合集中的游戏不会被删除。"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

/* ── 新建/编辑弹窗 ── */
function CollectionDialog({ collection, onClose, onSaved }: {
  collection: CollectionDetail | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(collection?.name || "")
  const [description, setDescription] = useState(collection?.description || "")
  const [published, setPublished] = useState(collection?.published ?? true)
  const [games, setGames] = useState<GameItem[]>(
    collection?.games.map(g => g.game) || []
  )
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<GameItem[]>([])
  const [searching, setSearching] = useState(false)

  // 搜索游戏
  useEffect(() => {
    if (search.trim().length < 2) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await api.get<{ data?: any }>(`/api/admin/games?search=${encodeURIComponent(search.trim())}&limit=8`)
        // /api/admin/games 返回 { success, data: [games[], count] }
        const games = Array.isArray(data.data) ? data.data : (data.data?.games || [])
        setSearchResults(games.map((g: any) => ({ id: g.id, serialId: g.serialId, title: g.title, coverImage: g.coverImage, studioName: g.studioName })))
      } catch { setSearchResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  function addGame(game: GameItem) {
    if (games.some(g => g.id === game.id)) return
    setGames(prev => [...prev, game])
    setSearch("")
    setSearchResults([])
  }

  function removeGame(id: string) {
    setGames(prev => prev.filter(g => g.id !== id))
  }

  function moveGame(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= games.length) return
    const copy = [...games]
    ;[copy[index], copy[newIndex]] = [copy[newIndex], copy[index]]
    setGames(copy)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("合集名称不能为空"); return }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        published,
        gameIds: games.map(g => g.id),
      }
      const url = collection
        ? `/api/admin/curated-collections/${collection.id}`
        : "/api/admin/curated-collections"
      if (collection) {
        await api.put(url, payload)
      } else {
        await api.post(url, payload)
      }
      toast.success(collection ? "合集已更新" : "合集已创建")
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4 pt-16">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-xl" style={{ borderRadius: "var(--radius-lg)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {collection ? "编辑合集" : "新建合集"}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* 合集名称 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">合集名称 *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="例如：Key 社经典作品合集" className={adminInput} />
          </div>

          {/* 合集简介 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">合集简介</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="例如：收录 Key 社代表性的视觉小说作品" className={adminInput} />
          </div>

          {/* 发布状态 */}
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 ring-1 ring-border">
            <div>
              <p className="text-sm font-medium">发布状态</p>
              <p className="text-xs text-muted-foreground">关闭后前台不显示此合集</p>
            </div>
            <button type="button" role="switch" aria-checked={published}
              onClick={() => setPublished(!published)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${published ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${published ? "translate-x-5" : "translate-x-0.5"} mt-0.5`} />
            </button>
          </div>

          {/* 选择游戏 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">选择游戏</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="输入游戏名称搜索..."
                className={adminInput + " pl-9"} />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {searchResults.length > 0 && (
              <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                {searchResults.map(g => (
                  <button key={g.id} type="button"
                    disabled={games.some(x => x.id === g.id)}
                    onClick={() => addGame(g)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors disabled:opacity-40">
                    {g.coverImage ? (
                      <Image src={g.coverImage} alt="" width={32} height={40} className="w-8 h-10 rounded object-cover" unoptimized />
                    ) : (
                      <div className="w-8 h-10 rounded bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{g.title}</p>
                      {g.studioName && <p className="text-xs text-muted-foreground truncate">{g.studioName}</p>}
                    </div>
                    {games.some(x => x.id === g.id) && (
                      <span className="text-xs text-muted-foreground">已添加</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 已选游戏列表 */}
          {games.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">已选游戏 ({games.length})</label>
              <div className="border border-border rounded-lg divide-y divide-border">
                {games.map((g, i) => (
                  <div key={g.id} className="flex items-center gap-2 px-3 py-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    {g.coverImage ? (
                      <Image src={g.coverImage} alt="" width={28} height={36} className="w-7 h-9 rounded object-cover shrink-0" unoptimized />
                    ) : (
                      <div className="w-7 h-9 rounded bg-muted shrink-0" />
                    )}
                    <span className="flex-1 text-sm text-foreground truncate">{g.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => moveGame(i, -1)} disabled={i === 0}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => moveGame(i, 1)} disabled={i === games.length - 1}
                        className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeGame(g.id)}
                        className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose}
            className="h-10 px-4 rounded-xl text-sm font-medium bg-muted text-foreground ring-1 ring-border hover:ring-primary/40 transition-all">
            取消
          </button>
          <button onClick={handleSave} disabled={saving} className={adminBtnPrimary}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  )
}
