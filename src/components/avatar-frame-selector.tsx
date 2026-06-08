"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { logger } from "@/lib/logger"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useState, useTransition } from "react"

interface FrameItem {
  id: string
  name: string
  description: string
  imageUrl: string
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
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [frames, setFrames] = useState<FrameItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadFrames = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/user/avatar-frame")
      if (res.ok) {
        const data = await res.json()
        setFrames(data.frames || [])
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

  async function handleSelect(frameId: string | null) {
    if (frameId === selected || saving) return
    setSelected(frameId)
    setSaving(true)
    try {
      const res = await fetch("/api/user/avatar-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameId }),
      })
      if (res.ok) {
        startTransition(async () => {
          await update({ avatarFrameId: frameId })
        })
      }
    } finally {
      setSaving(false)
    }
  }

  useBodyScrollLock(open)

  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(v => !v)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-secondary/60 px-3 py-3 transition-all hover:bg-secondary"
        >
          <span className="text-xl leading-none">🎭</span>
          <span className="text-xs font-medium text-foreground">头像框</span>
          {frames.length > 0 && (
            <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400">
              {frames.length}
            </span>
          )}
        </button>
      ) : (
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground"
        >
          🎭 更换头像框
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] touch-none flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="mx-4 w-full max-w-md rounded-2xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold text-foreground">选择头像框</h3>
              <button onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
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
                <div className="grid grid-cols-3 gap-3">
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

                  {frames.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleSelect(f.id)}
                      disabled={saving}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl p-3 ring-1 transition-all",
                        selected === f.id
                          ? "ring-primary bg-primary/10"
                          : "ring-border bg-secondary/50 hover:bg-accent hover:ring-primary/30",
                        saving && "opacity-50 cursor-wait"
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
                        {f.description && <div className="text-[10px] text-muted-foreground truncate max-w-[80px]">{f.description}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {saving && (
              <div className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
                保存中…
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}