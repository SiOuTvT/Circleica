"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Tag, TagGroup } from "@/components/ui/tag"
import { timeAgo } from "@/lib/time-ago"
import { AlertTriangle, Download, Loader2, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe, unwrapApiData } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { AddResourceDialog, type SubmittedResource } from "./add-resource-dialog"
import type { ActivityItemData } from "@/components/user-activity-timeline"

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

/** 右栏槽位里的统计行（label + 数值） */
export type RailStat = { label: string; value: number }

/** 资源 tab 的右栏槽位数据 */
export interface ResourceRailData {
  activities: ActivityItemData[]
  stats: RailStat[]
}

interface ResourceTabProps {
  /** 加载完成后把资源数回报给父级（供 tab 上的计数显示，不发额外请求） */
  onResourceCountChange?: (count: number) => void
  /** 把右栏槽位内容（资源动态 + 统计）回报给页面统一渲染 */
  onRailChange?: (data: ResourceRailData) => void
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

/** 分流默认摊开；超过这个条数才折叠为「前 N 条 + 展开全部」 */
const ENTRY_PREVIEW = 3

/** 从下载链接解析来源名（百度网盘 / 夸克 / Mega 等），解析不出来就回退域名 */
function sourceLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    const known: Record<string, string> = {
      "pan.baidu.com": "百度网盘",
      "yun.baidu.com": "百度网盘",
      "pan.quark.cn": "夸克网盘",
      "quark.cn": "夸克网盘",
      "mega.nz": "Mega",
      "drive.google.com": "Google Drive",
      "1drv.ms": "OneDrive",
      "aliyundrive.com": "阿里云盘",
      "www.alipan.com": "阿里云盘",
      "pan.xunlei.com": "迅雷网盘",
      "cowtransfer.com": "奶牛快传",
      "123pan.com": "123云盘",
      "lanzoui.com": "蓝奏云",
      "lanzoup.com": "蓝奏云",
      "lanzoux.com": "蓝奏云",
    }
    return known[host] ?? host
  } catch {
    return "外链"
  }
}

/* ─── 资源卡片组件 ─── */
const ResourceCard = memo(function ResourceCard({
  resource,
  isOwner,
  isGamePublisher,
  onEdit,
  onDelete,
  onReport,
  onDownload,
  resourceTagColor,
}: {
  resource: ApiResource
  isOwner: boolean
  isGamePublisher: boolean
  onEdit: () => void
  onDelete: () => void
  onReport: () => void
  onDownload: (entryId: string, entryIdx: number) => void
  resourceTagColor?: string
}) {
  // 合并所有标签
  const allTags = [
    ...resource.platform,
    ...resource.language,
    ...resource.runType,
    ...resource.resourceContent,
  ]

  // 体积取第一条填了大小的；下载数为各分流下载数之和
  const sizeLabel = resource.entries.find((e) => e.fileSize)?.fileSize || "—"
  const downloadTotal = resource.entries.reduce(
    (sum, e) => sum + (typeof e.downloadCount === "number" ? e.downloadCount : 0),
    0
  )
  // 分流默认摊开；超过 ENTRY_PREVIEW 条才折叠成「前 3 条 + 展开全部」
  const [showAllEntries, setShowAllEntries] = useState(false)
  const shownEntries =
    resource.entries.length > ENTRY_PREVIEW && !showAllEntries
      ? resource.entries.slice(0, ENTRY_PREVIEW)
      : resource.entries

  return (
    <div
      className={`flex flex-col gap-3.5 rounded-2xl p-4 ring-1 sm:p-5 ${
        resource.isReported
          ? "ring-amber-300/50 bg-amber-50/5 dark:bg-amber-950/10"
          : "ring-border bg-card"
      }`}
    >
      {/* ── 第一行：资源名称 + 右侧 体积 / 分流数 / 下载数 ── */}
      <div className="flex items-start gap-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-foreground">
            {resource.resourceName || "未命名资源"}
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            提交者 {resource.username || "热心网友"}，更新于 {timeAgo(resource.createdAt)}，说明：{resource.resourceNote || "（未填写）"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-[15px] font-bold tabular-nums text-foreground">{sizeLabel}</span>
          <span className="text-[11px] text-muted-foreground">
            {resource.entries.length} 个分流，下载 {downloadTotal}
          </span>
        </div>
      </div>

      {/* ── 失效标记 ── */}
      {resource.isReported && (
        <div>
          <Tag color="#f59e0b" className="gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            链接已失效
          </Tag>
        </div>
      )}

      {/* ── 资源标签：组色沿用 resourceTagColor ── */}
      <TagGroup>
        {allTags.map((tag) => (
          <Tag key={tag} scale="detail" color={resourceTagColor || undefined}>
            {tag}
          </Tag>
        ))}
      </TagGroup>

      {/* ── 分流：默认摊开在卡里，>3 条才折叠 ── */}
      <div className="flex flex-col border-t border-border pt-2">
        {shownEntries.map((entry, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/50 py-2.5 last:border-b-0">
            <span className="w-[76px] shrink-0 truncate text-[12.5px] font-semibold text-foreground">
              {sourceLabel(entry.url)}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {[entry.fileSize, entry.extractCode ? `提取码 ${entry.extractCode}` : ""]
                .filter(Boolean)
                .join("，")}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onReport}
                disabled={resource.isReportedByMe}
                className={cn(
                  "inline-flex h-7 items-center justify-center rounded-md px-3 text-xs font-semibold ring-1 ring-border transition-colors",
                  resource.isReportedByMe
                    ? "cursor-default text-amber-400/60"
                    : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                )}
                title={resource.isReportedByMe ? "已反馈" : "举报失效"}
              >
                举报失效
              </button>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { if (entry.id) onDownload(entry.id, i) }}
                className="inline-flex h-7 w-[48px] items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                下载
              </a>
            </span>
          </div>
        ))}
        {resource.entries.length > ENTRY_PREVIEW && !showAllEntries && (
          <button
            type="button"
            onClick={() => setShowAllEntries(true)}
            className="self-start pt-2 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
          >
            展开全部 {resource.entries.length} 个分流
          </button>
        )}
      </div>

      {/* ── 本人的编辑 / 删除入口：卡片本体不可点，只有这些控件与上面两个按钮可点 ── */}
      {(isOwner || isGamePublisher) && (
        <div className="flex items-center justify-end gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-primary"
              title="编辑"
            >
              <Pencil className="h-3.5 w-3.5" />
              编辑
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-red-400"
            title="删除"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </div>
      )}
    </div>
  )
})


/* ─── 主组件 ─── */
/** 从创建/编辑资源的响应体中提取单个 ApiResource（兼容 { data: { resource } } / { resource } / 直接资源对象 三种形态）。 */
function extractResource(body: unknown): ApiResource | undefined {
  if (!body || typeof body !== "object") return undefined
  const obj = body as Record<string, unknown>
  const inner = obj.data !== undefined ? obj.data : body
  if (inner && typeof inner === "object") {
    const i = inner as Record<string, unknown>
    if (i.resource && typeof i.resource === "object") return i.resource as ApiResource
    return i as unknown as ApiResource
  }
  return undefined
}

export function ResourceTab({
  onResourceCountChange,
  onRailChange,
  downloadLinks: _downloadLinks,
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
  const [addOpen, setAddOpen] = useState(false)

  // 资源数回报给父级（tab 上的计数），不发额外请求
  useEffect(() => {
    onResourceCountChange?.(resources.length)
  }, [resources.length, onResourceCountChange])
  const [editingResource, setEditingResource] = useState<ApiResource | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiResource | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<ApiResource | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  /* ── 游戏动态（详情页：按游戏聚合，含"发布游戏" + 资源添加/编辑）── */
  const [gameActivities, setGameActivities] = useState<ActivityItemData[]>([])
  const [gameActivityReady, setGameActivityReady] = useState(false)

  useEffect(() => {
    let alive = true
    setGameActivityReady(false)
    apiFetchSafe<ActivityItemData[]>(`/api/games/activities/${gameId}`)
      .then(({ ok, data }) => {
        if (!alive) return
        const list = ok ? (unwrapApiData<ActivityItemData[]>(data) ?? []) : []
        setGameActivities(Array.isArray(list) ? list : [])
      })
      .catch(() => { if (alive) setGameActivities([]) })
      .finally(() => { if (alive) setGameActivityReady(true) })
    return () => { alive = false }
  }, [gameId])

  /* ── 从API加载资源 ── */
  const fetchResources = useCallback(async () => {
    try {
      setLoadError(null)
      const { ok, data } = await apiFetchSafe<ApiResource[]>(`/api/games/${gameId}/resources`)
      if (!ok) {
        throw new Error("加载失败")
      }
      // GET /api/games/[id]/resources 返回 { success, data: 资源数组 }，
      // apiFetchSafe 的 data 是完整响应体，data.data 才是数组本身。
      const d = unwrapApiData<ApiResource[]>(data)
      setResources(Array.isArray(d) ? d : [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载资源失败")
    } finally {
      setLoading(false)
    }
  }, [gameId])

  /* ── 下载计数：fire-and-forget，不阻塞跳转；成功后在本地回填计数 ── */
  const trackDownload = useCallback((resourceId: string, entryId: string, resourceIdx: number, entryIdx: number) => {
    apiFetchSafe<{ downloadCount?: number }>(
      `/api/games/${gameId}/resources/${resourceId}/entries/${entryId}/download`,
      { method: "POST" }
    )
      .then(({ ok, data }) => {
        if (ok) {
          const count = unwrapApiData<{ downloadCount?: number }>(data)?.downloadCount
          if (typeof count === "number") {
            setResources((prev) =>
              prev.map((r, ri) =>
                ri === resourceIdx
                  ? {
                      ...r,
                      entries: r.entries.map((e, ei) =>
                        ei === entryIdx && "downloadCount" in e ? { ...e, downloadCount: count } : e
                      ),
                    }
                  : r
              )
            )
          }
        }
      })
      .catch(() => { /* 计数失败不影响跳转 */ })
  }, [gameId])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  /* ── 添加资源 ── */
  const handleAdd = useCallback(async (resource: SubmittedResource) => {
    setActionLoading(true)
    try {
      const { ok, data, error } = await apiFetchSafe<{ resource?: ApiResource }>(`/api/games/${gameId}/resources`, {
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
      const added = extractResource(data)
      if (added) setResources(prev => [added, ...prev])
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
      const { ok, data, error } = await apiFetchSafe<{ resource?: ApiResource }>(`/api/games/${gameId}/resources/${editingResource.id}`, {
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
      const updated = extractResource(data)
      if (updated) setResources(prev => prev.map(r => r.id === editingResource.id ? { ...r, ...updated } : r))
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
      const { ok, data, error } = await apiFetchSafe<{ data?: { alreadyReported?: boolean; isReported?: boolean; isReportedByMe?: boolean }; alreadyReported?: boolean; isReported?: boolean; isReportedByMe?: boolean }>(`/api/games/${gameId}/resources/${reportTarget.id}/report`, {
        method: "POST",
      })
      if (!ok) {
        throw new Error(error || "反馈失败")
      }
      const d = data?.data ?? data
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

  // 侧栏统计：全部基于已加载的资源，不额外请求
  const totalEntries = resources.reduce((sum, r) => sum + r.entries.length, 0)
  const totalDownloads = resources.reduce(
    (sum, r) =>
      sum +
      r.entries.reduce(
        (inner, e) => inner + (typeof e.downloadCount === "number" ? e.downloadCount : 0),
        0
      ),
    0
  )
  const reportedCount = resources.filter((r) => r.isReported).length
  const statRows = useMemo<RailStat[]>(
    () => [
      { label: "资源数", value: resources.length },
      { label: "分流数", value: totalEntries },
      { label: "下载计数", value: totalDownloads },
      { label: "失效举报", value: reportedCount },
    ],
    [resources.length, totalEntries, totalDownloads, reportedCount]
  )

  // 右栏槽位内容交给页面统一渲染（整页只有一个右栏，宽度与 x 恒定）
  useEffect(() => {
    onRailChange?.({ activities: gameActivities, stats: statRows })
  }, [gameActivities, statRows, onRailChange])

  // 槽位里的「添加资源」按钮通过事件打开本组件内的弹窗（与站内既有的跨组件事件一致）
  useEffect(() => {
    const onOpen = () => setAddOpen(true)
    window.addEventListener("game-detail-add-resource", onOpen)
    return () => window.removeEventListener("game-detail-add-resource", onOpen)
  }, [])

  return (
    <div>

      {/* ─── 资源卡列表（右栏内容由页面统一槽位渲染）─── */}
      <div className="min-w-0">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">加载资源中...</span>
          </div>
        )}

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

        {!loading && !loadError && resources.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
            还没有人分享资源
          </div>
        )}

        {/* 用户提交的资源卡片列表 */}
        {!loading && !loadError && resources.length > 0 && (
          <>
            <div className="space-y-4">
              {resources.slice(0, displayCount).map((res, resIdx) => {
                const isOwner = !!currentUserId && res.userId === currentUserId
                const isGamePublisher = !!publisherId && !!currentUserId && publisherId === currentUserId
                return (
                  <ResourceCard
                    key={res.id}
                    resource={res}
                    isOwner={isOwner}
                    isGamePublisher={isGamePublisher}
                    resourceTagColor={resourceTagColor}
                    onDownload={(entryId, entryIdx) => trackDownload(res.id, entryId, resIdx, entryIdx)}
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
      </div>

      {/* 添加资源弹窗：触发器在页面右栏槽位里，这里只保留弹窗本体 */}
      <AddResourceDialog
        gameId={gameId}
        userId={currentUserId || ""}
        username={username || ""}
        userAvatar={userAvatar ?? null}
        isLoggedIn={isLoggedIn}
        onAdd={handleAdd}
        open={addOpen}
        onOpenChange={setAddOpen}
        hideTrigger
      />

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

      {/* 制作人员已移至简介 tab */}
    </div>
  )
}