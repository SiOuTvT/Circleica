"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { logger } from "@/lib/logger"
import { cn } from "@/lib/utils"
import { Tag } from "@/components/ui/tag"
import { Sparkles, X } from "lucide-react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { apiFetchSafe } from "@/lib/api-client"

interface FrameItem {
  id: string
  name: string
  description: string
  imageUrl: string
  price: number
}

interface FramesResponse {
  frames?: FrameItem[]
  ownedFrameIds?: string[]
  totalMarks?: number
  availableMarks?: number
}

export function AvatarFrameSelector({
  currentFrameId,
  userImage,
  userName,
  compact,
}: {
  currentFrameId: string | null
  userImage?: string | null
  userName: string
  compact?: boolean
}) {
  const { update } = useSession()
  const [selected, setSelected] = useState<string | null>(currentFrameId)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [frames, setFrames] = useState<FrameItem[]>([])
  const [ownedFrameIds, setOwnedFrameIds] = useState<string[]>([])
  const [availableMarks, setAvailableMarks] = useState(0)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState<FrameItem | null>(null)

  const loadFrames = useCallback(async () => {
    setLoading(true)
    try {
      // apiFetchSafe 返回后端完整响应体 { success, data: { frames, ownedFrameIds, ... } }，需解 data.data
      const { ok, data } = await apiFetchSafe<{ data?: FramesResponse }>("/api/user/avatar-frame")
      if (ok) {
        const inner = (data as { data?: FramesResponse })?.data
        setFrames(inner?.frames || [])
        setOwnedFrameIds(inner?.ownedFrameIds || [])
        setAvailableMarks(inner?.availableMarks ?? 0)
      }
    } catch (e) {
      logger.upload.error("加载头像框列表失败", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && frames.length === 0) {
      loadFrames()
    }
  }, [open, frames.length, loadFrames])

  async function handleSelect(frame: FrameItem | null) {
    const frameId = frame?.id ?? null
    if (frameId === selected || saving) return

    // 付费框且未拥有：先确认购买
    if (frame && frame.price > 0 && !ownedFrameIds.includes(frame.id)) {
      setConfirming(frame)
      return
    }
    await applySelect(frameId)
  }

  async function handleConfirmPurchase() {
    if (!confirming || saving) return
    const frame = confirming
    setConfirming(null)
    setSaving(true)
    try {
      const { ok, data } = await apiFetchSafe<{ error?: string }>(
        `/api/user/avatar-frame/${frame.id}/purchase`,
        { method: "POST", body: {} },
      )
      if (!ok) {
        if (data?.error) logger.upload.warn("兑换头像框失败", { error: data.error })
        return
      }
      setOwnedFrameIds((prev) => [...prev, frame.id])
      setAvailableMarks((prev) => Math.max(0, prev - frame.price))
      setSelected(frame.id)
      await update({ avatarFrameId: frame.id })
    } catch (e) {
      logger.upload.error("兑换头像框失败", e)
    } finally {
      setSaving(false)
    }
  }

  async function applySelect(frameId: string | null) {
    setSelected(frameId)
    setSaving(true)
    try {
      const { ok } = await apiFetchSafe("/api/user/avatar-frame", { method: "PUT", body: { frameId } })
      if (ok) {
        await update({ avatarFrameId: frameId })
      }
    } finally {
      setSaving(false)
    }
  }

  useBodyScrollLock(open || !!confirming)

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary"
        >
          <span className="text-xl leading-none">🎭</span>
          <span className="text-xs font-medium text-foreground">头像框</span>
          {frames.length > 0 && (
            <Tag variant="badge" color="#a855f7">
              {frames.length}
            </Tag>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground"
        >
          🎭 更换头像框
        </button>
      )}

      {open && createPortal(
        <div className="fixed inset-0 z-[100] touch-none flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-pointer" onClick={() => setOpen(false)}>
          <div
            className="mx-4 w-full max-w-md rounded-2xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: "var(--shadow-3)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold text-foreground">选择头像框</h3>
              <button onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 印记余额提示 */}
            <div className="flex items-center justify-between px-5 pt-3">
              <span className="text-xs text-muted-foreground">标记为「印记」的头像框需签到兑换</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-400">
                <Sparkles className="h-3 w-3" />
                可用 {availableMarks} 印记
              </span>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {/* Preview */}
              <div className="mb-5 flex justify-center">
                <div className="relative w-20 h-20">
                  <div className="w-full h-full rounded-full overflow-hidden bg-primary/80 flex items-center justify-center">
                    {userImage ? (
                      <Image src={userImage} alt={userName} width={80} height={80} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      <span className="text-2xl font-bold text-white">{userName[0].toUpperCase()}</span>
                    )}
                  </div>
                  {selected && (() => {
                    const f = frames.find(fr => fr.id === selected)
                    return f ? (
                      <Image src={f.imageUrl} alt={f.name} width={80} height={80} className="absolute inset-0 w-full h-full object-contain pointer-events-none" unoptimized />
                    ) : null
                  })()}
                </div>
              </div>

              {/* Grid */}
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">加载中…</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* No frame option */}
                  <button
                    onClick={() => handleSelect(null)}
                    disabled={saving}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl p-3 ring-1 transition-all",
                      selected === null
                        ? "ring-primary bg-primary/10"
                        : "ring-border bg-secondary/50 hover:bg-accent hover:ring-primary/30",
                      saving && "opacity-50 cursor-wait"
                    )}
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-500/30 to-zinc-600/20 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">无</span>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-foreground">无边框</div>
                    </div>
                  </button>

                  {frames.map(f => {
                    const owned = ownedFrameIds.includes(f.id)
                    const canAfford = availableMarks >= f.price
                    const isLocked = f.price > 0 && !owned
                    return (
                      <button
                        key={f.id}
                        onClick={() => handleSelect(f)}
                        disabled={saving}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl p-3 ring-1 transition-all",
                          selected === f.id
                            ? "ring-primary bg-primary/10"
                            : "ring-border bg-secondary/50 hover:bg-accent hover:ring-primary/30",
                          saving && "opacity-50 cursor-wait",
                          isLocked && !canAfford && "opacity-60"
                        )}
                      >
                        <div className="relative w-14 h-14">
                          <div className="w-full h-full rounded-full overflow-hidden bg-primary/80 flex items-center justify-center">
                            {userImage ? (
                              <Image src={userImage} alt="" width={56} height={56} className="h-full w-full object-cover" unoptimized />
                            ) : (
                              <span className="text-sm font-bold text-white">{userName[0].toUpperCase()}</span>
                            )}
                          </div>
                          <Image src={f.imageUrl} alt={f.name} width={56} height={56} className="absolute inset-0 w-full h-full object-contain pointer-events-none" unoptimized />
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-medium text-foreground truncate max-w-[80px]">{f.name}</div>
                          {f.price > 0 ? (
                            <div className={cn("text-micro font-medium", owned ? "text-primary" : canAfford ? "text-amber-400" : "text-muted-foreground/60")}>
                              {owned ? "已拥有" : `${f.price} 印记`}
                            </div>
                          ) : (
                            <div className="text-micro text-muted-foreground/60">免费</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {saving && (
              <div className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
                保存中…
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 购买确认弹窗 */}
      {confirming && createPortal(
        <div className="fixed inset-0 z-[110] touch-none flex items-center justify-center bg-black/50 backdrop-blur-sm cursor-pointer" onClick={() => setConfirming(null)}>
          <div
            className="mx-4 w-full max-w-sm rounded-2xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: "var(--shadow-3)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">兑换头像框</h3>
            </div>
            <div className="px-5 py-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 shrink-0">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                  <Image src={confirming.imageUrl} alt={confirming.name} width={56} height={56} className="absolute inset-0 w-full h-full object-contain" unoptimized />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{confirming.name}</p>
                  <p className="text-xs text-amber-400 mt-0.5">需要 {confirming.price} 印记</p>
                  <p className={cn("text-xs mt-1", availableMarks >= confirming.price ? "text-muted-foreground" : "text-red-400")}>
                    当前可用 {availableMarks} 印记
                    {availableMarks < confirming.price && "（不足，先去签到吧）"}
                  </p>
                </div>
              </div>
              {confirming.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{confirming.description}</p>
              )}
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-accent"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={saving || availableMarks < confirming.price}
                className="flex-1 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "兑换中…" : "确认兑换"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
