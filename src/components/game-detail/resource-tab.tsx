"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Tag, TagGroup } from "@/components/ui/tag"
import { timeAgo } from "@/lib/time-ago"
import { AlertTriangle, ChevronDown, ChevronUp, Download, Loader2, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"
import { AddResourceDialog, type SubmittedResource } from "./add-resource-dialog"

/* ─── 后台配置的下载链接 ─── */
type DownloadLink = { label: string; url: string }

/* ─── 制作人员 ─── */
type Creator = {
  id: string
  name: string
  nameJa: string | null
  avatar: string | null
  role: string
}

/* ─── API返回的资源类型（含服务器提供的字段） ─── */
interface ApiResource extends SubmittedResource {
  userResourceCount: number
  isReported?: boolean
  isReportedByMe?: boolean
}

interface ResourceTabProps {
  downloadLinks: DownloadLink[]
  creators?: Creator[]
  roleLabels?: Record<string, string>
  isLoggedIn: boolean
  isFav: boolean
  favCount: number
  onToggleFav: () => void
  gameId: string
  currentUserId?: string
  username?: string
  userAvatar?: string | null
  resourceTagColor?: string
  publisherId?: string
}

/* ─── 备注展开收起组件 ─── */
function CollapsibleNote({ text, maxLines = 3 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false)
  const [needsCollapse, setNeedsCollapse] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight)
      const maxHeight = lineHeight * maxLines
      setNeedsCollapse(textRef.current.scrollHeight > maxHeight + 2)
    }
  }, [text, maxLines])

  // 不需要折叠时直接全部显示
  if (!needsCollapse) {
    return (
      <div className="px-4 pb-3">
        <p ref={textRef} className="text-sm text-foreground/90 leading-relaxed">
          {text}
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-3">
      <div
        className="relative overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: expanded ? "500px" : `${maxLines * 1.5}em` }}
      >
        <p ref={!expanded ? textRef : undefined} className="text-sm text-foreground/90 leading-relaxed">
          {text}
        </p>
        {!expanded && (
          <div
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{ background: "linear-gradient(transparent, var(--card))" }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="mt-1 flex items-center gap-1 text-xs font-medium text-primary/70 hover:text-primary transition-colors"
      >
        {expanded ? (
          <>
            收起 <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            展开全部 <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>
    </div>
  )
}

/* ─── 资源卡片组件 ─── */
const ResourceCard = memo(function ResourceCard({
  resource,
  isOwner,
  isGamePublisher,
  onEdit,
  onDelete,
  onReport,
  resourceTagColor,
}: {
  resource: ApiResource
  isOwner: boolean
  isGamePublisher: boolean
  onEdit: () => void
  onDelete: () => void
  onReport: () => void
  resourceTagColor?: string
}) {
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set())
  const toggleEntry = useCallback((idx: number) => {
    setExpandedEntries(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  // 合并所有标签
  const allTags = [
    ...resource.platform,
    ...resource.language,
    ...resource.runType,
    ...resource.resourceContent,
  ]

  return (
    <div
      className={`relative rounded-2xl ring-1 overflow-visible transition-all duration-200 hover:shadow-2 ${
        resource.isReported
          ? "ring-amber-300/50 bg-amber-50/5 dark:bg-amber-950/10 hover:ring-amber-300/70"
          : "ring-border bg-card hover:ring-foreground/20"
      }`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* ── 第一行：胶囊标签流 ── */}
      <TagGroup className="px-4 pt-4 pb-2.5">
        {allTags.slice(0, 8).map((tag) => (
          <Tag key={tag} color={resourceTagColor || undefined}>
            {tag}
          </Tag>
        ))}
        {allTags.length > 8 && (
          <span className="text-xs text-muted-foreground">+{allTags.length - 8}</span>
        )}
      </TagGroup>

      {/* ── 第二行：发布者用户信息栏 ── */}
      <div className="flex items-center gap-3.5 px-4 pb-2.5">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground overflow-hidden shrink-0 ring-2 ring-background">
          {resource.userAvatar ? (
            <Image src={resource.userAvatar} alt="" width={32} height={32} className="h-full w-full object-cover" unoptimized />
          ) : (
            (resource.username || "?")[0]
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {resource.username || "热心网友"}
          </p>
          <p className="text-sm text-muted-foreground/80">
            {timeAgo(resource.createdAt)}
            {resource.userResourceCount > 0 && (
              <span className="ml-2">· 已发布 {resource.userResourceCount} 条资源</span>
            )}
          </p>
        </div>
      </div>

      {/* ── 失效标记 ── */}
      {resource.isReported && (
        <div className="px-4 pb-2">
          <Tag color="#f59e0b" className="gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            链接已失效
          </Tag>
        </div>
      )}

      {/* ── 第三行：资源名称 ── */}
      {resource.resourceName && (
        <div className="px-4 pb-2.5">
          <p className="text-base font-semibold text-foreground leading-snug">
            {resource.resourceName}
          </p>
        </div>
      )}

      {/* ── 第四行：下载链接按钮 ── */}
      <div className="px-4 pb-2.5">
        <div className="flex flex-wrap gap-2">
          {resource.entries.map((entry, i) => {
            const isExpanded = expandedEntries.has(i)
            const label = resource.entries.length > 1 ? `分流 ${i + 1}` : "下载"
            return (
              <div key={i} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleEntry(i)}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/15 active:bg-primary/20 transition-all duration-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  {label}
                  {entry.fileSize && (
                    <span className="text-primary/60 ml-0.5">({entry.fileSize})</span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 opacity-60" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  )}
                </button>
                {/* 展开区域：真实链接、提取码、解压码 */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: isExpanded ? "200px" : "0px", opacity: isExpanded ? 1 : 0 }}
                >
                  <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm space-y-1.5">
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-primary underline underline-offset-2 break-all hover:text-primary/80 transition-colors"
                    >
                      {entry.url}
                    </a>
                    {entry.extractCode && (
                      <p className="text-muted-foreground">
                        提取码：<span className="font-mono font-semibold text-foreground">{entry.extractCode}</span>
                      </p>
                    )}
                    {entry.decompressCode && (
                      <p className="text-muted-foreground">
                        解压码：<span className="font-mono font-semibold text-foreground">{entry.decompressCode}</span>
                      </p>
                    )}
                    {!entry.extractCode && !entry.decompressCode && !entry.fileSize && (
                      <p className="text-muted-foreground/50">无需提取码</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 第五行：资源备注（可展开收起）── */}
      {resource.resourceNote && (
        <CollapsibleNote text={resource.resourceNote} maxLines={3} />
      )}

      {/* ── 右下角：反馈/编辑/删除按钮 ── */}
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
        {/* 非本人可以看到反馈按钮 */}
        {!isOwner && !isGamePublisher && (
          <button
            type="button"
            onClick={onReport}
            disabled={resource.isReportedByMe}
            className={`p-2 rounded-lg transition-all duration-200 ${
              resource.isReportedByMe
                ? "text-amber-400/60 cursor-default"
                : "text-muted-foreground/40 hover:text-amber-400 hover:bg-amber-500/10"
            }`}
            title={resource.isReportedByMe ? "已反馈" : "反馈链接失效"}
          >
            <AlertTriangle className="h-4 w-4" />
          </button>
        )}
        {(isOwner || isGamePublisher) && (
          <>
            {isOwner && (
              <button
                type="button"
                onClick={onEdit}
                className="p-2 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all duration-200"
                title="编辑"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded-lg text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
})


/* ─── 主组件 ─── */
export function ResourceTab({
  downloadLinks,
  creators: _creators,
  roleLabels: _roleLabels,
  isLoggedIn,
  isFav: _isFav,
  favCount: _favCount,
  onToggleFav: _onToggleFav,
  gameId,
  currentUserId,
  username,
  userAvatar,
  resourceTagColor,
  publisherId,
}: ResourceTabProps) {
  const [resources, setResources] = useState<ApiResource[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [displayCount, setDisplayCount] = useState(20) // 初始显示 20 条
  const [editingResource, setEditingResource] = useState<ApiResource | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiResource | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<ApiResource | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  /* ── 从API加载资源 ── */
  const fetchResources = useCallback(async () => {
    try {
      setLoadError(null)
      const { ok, data } = await apiFetchSafe<{ data?: { resources?: any[] }; resources?: any[] }>(`/api/games/${gameId}/resources`)
      if (!ok) {
        throw new Error("加载失败")
      }
      const d = data?.data ?? data
      setResources(d?.resources ?? [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载资源失败")
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  /* ── 添加资源 ── */
  const handleAdd = useCallback(async (resource: SubmittedResource) => {
    setActionLoading(true)
    try {
      const { ok, data, error } = await apiFetchSafe<{ data?: any; resource?: any }>(`/api/games/${gameId}/resources`, {
        method: "POST",
        body: {
          entries: resource.entries,
          platform: resource.platform,
          language: resource.language,
          runType: resource.runType,
          resourceContent: resource.resourceContent,
          resourceName: resource.resourceName,
          resourceNote: resource.resourceNote,
        },
      })
      if (!ok) {
        throw new Error(error || "提交失败")
      }
      const d = data?.data ?? data
      setResources(prev => [d.resource ?? d, ...prev])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交资源失败")
    } finally {
      setActionLoading(false)
    }
  }, [gameId])

  /* ── 编辑资源 ── */
  const handleEdit = useCallback(async (resource: SubmittedResource) => {
    if (!editingResource) return
    setActionLoading(true)
    try {
      const { ok, data, error } = await apiFetchSafe<{ data?: any; resource?: any }>(`/api/games/${gameId}/resources/${editingResource.id}`, {
        method: "PUT",
        body: {
          entries: resource.entries,
          platform: resource.platform,
          language: resource.language,
          runType: resource.runType,
          resourceContent: resource.resourceContent,
          resourceName: resource.resourceName,
          resourceNote: resource.resourceNote,
        },
      })
      if (!ok) {
        throw new Error(error || "编辑失败")
      }
      const d = data?.data ?? data
      setResources(prev => prev.map(r => r.id === editingResource.id ? (d.resource ?? d) : r))
      setEditingResource(null)
      setEditOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "编辑资源失败")
    } finally {
      setActionLoading(false)
    }
  }, [gameId, editingResource])

  /* ── 反馈链接失效 ── */
  const handleReportConfirm = useCallback(async () => {
    if (!reportTarget) return
    setActionLoading(true)
    try {
      const { ok, data, error } = await apiFetchSafe<{ data?: any; alreadyReported?: boolean }>(`/api/games/${gameId}/resources/${reportTarget.id}/report`, {
        method: "POST",
      })
      if (!ok) {
        throw new Error(error || "反馈失败")
      }
      const d = (data?.data ?? data) as { alreadyReported?: boolean; isReported?: boolean; isReportedByMe?: boolean } | undefined
      if (d?.alreadyReported) {
        toast.info("你已经反馈过了")
      } else {
        toast.success("已反馈，感谢你的帮助！")
        setResources(prev => prev.map(r =>
          r.id === reportTarget.id
            ? { ...r, isReported: true, isReportedByMe: true }
            : r
        ))
      }
      setReportTarget(null)
      setReportOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "反馈失败")
    } finally {
      setActionLoading(false)
    }
  }, [gameId, reportTarget])

  /* ── 删除资源 ── */
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      const { ok, error } = await apiFetchSafe(`/api/games/${gameId}/resources/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (!ok) {
        throw new Error(error || "删除失败")
      }
      setResources(prev => prev.filter(r => r.id !== deleteTarget.id))
      setDeleteTarget(null)
      setDeleteOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除资源失败")
    } finally {
      setActionLoading(false)
    }
  }, [gameId, deleteTarget])

  return (
    <div className="space-y-5">
      {/* 添加资源按钮 + 收藏按钮 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">下载链接</span>
        <div className="flex items-center gap-2">
          <AddResourceDialog
            gameId={gameId}
            userId={currentUserId || ""}
            username={username || ""}
            userAvatar={userAvatar ?? null}
            isLoggedIn={isLoggedIn}
            onAdd={handleAdd}
          />
        </div>
      </div>

      {/* 加载中状态 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">加载资源中...</span>
        </div>
      )}

      {/* 加载错误 */}
      {loadError && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-sm text-red-400">{loadError}</p>
          <button
            type="button"
            onClick={fetchResources}
            className="mt-2 text-sm font-medium text-red-700 underline hover:no-underline"
          >
            重试
          </button>
        </div>
      )}

      {/* 用户提交的资源卡片列表 */}
      {!loading && !loadError && resources.length > 0 && (
        <>
          <div className="space-y-3">
            {resources.slice(0, displayCount).map((res) => {
              const isOwner = !!currentUserId && res.userId === currentUserId
              const isGamePublisher = !!publisherId && !!currentUserId && publisherId === currentUserId
              return (
                <ResourceCard
                  key={res.id}
                  resource={res}
                  isOwner={isOwner}
                  isGamePublisher={isGamePublisher}
                  resourceTagColor={resourceTagColor}
                  onEdit={() => {
                    setEditingResource(res)
                    setEditOpen(true)
                  }}
                  onDelete={() => {
                    setDeleteTarget(res)
                    setDeleteOpen(true)
                  }}
                  onReport={() => {
                    if (!isLoggedIn) {
                      toast.error("请先登录")
                      return
                    }
                    setReportTarget(res)
                    setReportOpen(true)
                  }}
                />
              )
            })}
          </div>
          {displayCount < resources.length && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setDisplayCount(c => c + 20)}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                加载更多（{resources.length - displayCount} 条）
              </button>
            </div>
          )}
        </>
      )}

      {/* 空状态 */}
      {!loading && !loadError && resources.length === 0 && downloadLinks.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {isLoggedIn ? "还没有人分享资源，成为第一个分享者吧！" : "还没有人分享资源，等一等~"}
          </p>
          {isLoggedIn && (
            <AddResourceDialog
              gameId={gameId}
              userId={currentUserId || ""}
              username={username || ""}
              userAvatar={userAvatar ?? null}
              isLoggedIn={isLoggedIn}
              onAdd={handleAdd}
            />
          )}
        </div>
      )}

      {/* 编辑资源弹窗 */}
      {editingResource && (
        <AddResourceDialog
          gameId={gameId}
          userId={currentUserId || ""}
          username={username || ""}
          userAvatar={userAvatar ?? null}
          isLoggedIn={isLoggedIn}
          editData={editingResource}
          onEdit={handleEdit}
          open={editOpen}
          onOpenChange={(v) => {
            setEditOpen(v)
            if (!v) setEditingResource(null)
          }}
          hideTrigger
        />
      )}

      {/* 反馈确认弹窗 */}
      <ConfirmDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="反馈链接失效"
        description={`确定要反馈"${reportTarget?.resourceName || "此资源"}"的下载链接已失效吗？`}
        confirmText={actionLoading ? "提交中..." : "确定反馈"}
        onConfirm={handleReportConfirm}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除资源"
        description={`确定要删除"${deleteTarget?.resourceName || "此资源"}"吗？删了就找不回来了。`}
        confirmText={actionLoading ? "删除中..." : "删除"}
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />

      {/* 后台配置的下载链接 */}
      {downloadLinks.length > 0 && (
        <div className="space-y-2">
          {downloadLinks.map((dl, i) => (
            <a
              key={i}
              href={dl.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 transition-opacity"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
              {dl.label || "下载"}
            </a>
          ))}
        </div>
      )}

      {/* 制作人员已移至简介 tab */}
    </div>
  )
}