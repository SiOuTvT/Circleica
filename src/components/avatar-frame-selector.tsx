"use client"

import { AvatarFrame } from "@/components/avatar-frame"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { useState, useTransition } from "react"

const FRAMES = [
  { id: "none",       label: "无边框",   desc: "经典简洁",      color: "from-zinc-500/20 to-zinc-600/10" },
  { id: "slime",      label: "史莱姆",   desc: "QQ弹弹的绿色", color: "from-emerald-500/20 to-green-500/10" },
  { id: "sakura",     label: "樱花",     desc: "粉色花瓣飘落", color: "from-pink-500/20 to-rose-500/10" },
  { id: "starlight",  label: "星光",     desc: "星辰闪烁",     color: "from-blue-500/20 to-indigo-500/10" },
  { id: "aurora",     label: "极光",     desc: "幻彩流光",     color: "from-violet-500/20 to-fuchsia-500/10" },
  { id: "flame",      label: "烈焰",     desc: "燃烧的火焰",   color: "from-orange-500/20 to-red-500/10" },
]

export function AvatarFrameSelector({
  currentFrame,
  userImage,
  userName,
}: {
  currentFrame: string
  userImage?: string | null
  userName: string
}) {
  const { update } = useSession()
  const [selected, setSelected] = useState(currentFrame)
  const [saving, setSaving] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  async function handleSelect(frameId: string) {
    if (frameId === selected || saving) return
    setSelected(frameId)
    setSaving(true)
    try {
      const res = await fetch("/api/user/avatar-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame: frameId }),
      })
      if (res.ok) {
        // Update session so nav bar reflects the change
        startTransition(async () => {
          await update({ avatarFrame: frameId })
        })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-accent-foreground"
      >
        🎭 更换头像框
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="mx-4 w-full max-w-lg rounded-2xl bg-card ring-1 ring-border overflow-hidden"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold text-foreground">选择头像框</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
            </div>

            <div className="p-5">
              {/* Preview */}
              <div className="mb-5 flex justify-center">
                <AvatarFrame frameId={selected} size={96}>
                  {userImage ? (
                    <img src={userImage} alt={userName} className="h-full w-full object-cover rounded-full" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-2xl font-bold text-white">
                      {userName[0].toUpperCase()}
                    </div>
                  )}
                </AvatarFrame>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-3">
                {FRAMES.map(f => (
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
                    <AvatarFrame frameId={f.id} size={48}>
                      {userImage ? (
                        <img src={userImage} alt="" className="h-full w-full object-cover rounded-full" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
                          {userName[0].toUpperCase()}
                        </div>
                      )}
                    </AvatarFrame>
                    <div className="text-center">
                      <div className="text-xs font-medium text-foreground">{f.label}</div>
                      <div className="text-[10px] text-muted-foreground">{f.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {saving && (
              <div className="border-t border-border px-5 py-3 text-center text-xs text-muted-foreground">
                保存中…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}