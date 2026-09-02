"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Users, X, Loader2 } from "lucide-react"
import { apiGet } from "@/lib/api-client"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface UserLite {
  id: string; serialId?: number; username: string; avatar: string; composedAvatarUrl?: string | null; bio: string
}

/* 用户主页头像下的「关注 / 粉丝」数字块 → 可点击打开弹窗
 * 弹窗：宽度适中(max-w-md)、高度足够(max-h-[70vh] 内部滚动)、列表项字体 text-sm 不偏小。
 */

export function ProfileStatCounters({ userId, following, followers }: {
  userId: string; following: number; followers: number
}) {
  const [open, setOpen] = useState<null | "following" | "followers">(null)
  const [users, setUsers] = useState<UserLite[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const load = useCallback(async (type: "following" | "followers") => {
    setLoading(true)
    try {
      if (type === "following") {
        const data = await apiGet<{ success: boolean; data: { items: { following: UserLite | null }[] } }>(`/api/profile/${userId}/follows?page=1`)
        setUsers(Array.isArray(data.data?.items) ? data.data.items.map(i => i.following).filter((u): u is UserLite => u !== null) : [])
      } else {
        const data = await apiGet<{ success: boolean; data: { items: { follower: UserLite | null }[] } }>(`/api/profile/${userId}/followers?page=1`)
        setUsers(Array.isArray(data.data?.items) ? data.data.items.map(i => i.follower).filter((u): u is UserLite => u !== null) : [])
      }
    } catch { setUsers([]) } finally { setLoading(false) }
  }, [userId])

  const openModal = (type: "following" | "followers") => { setOpen(type); setUsers([]); load(type) }

  return (
    <>
      <div className="mt-4 sm:mt-6 flex items-center justify-center gap-8 sm:gap-12">
        <button onClick={() => openModal("following")} className="flex flex-col items-center transition-opacity hover:opacity-70">
          <span className="text-lg font-bold text-foreground">{following}</span>
          <span className="text-xs text-muted-foreground mt-2">关注</span>
        </button>
        <button onClick={() => openModal("followers")} className="flex flex-col items-center transition-opacity hover:opacity-70">
          <span className="text-lg font-bold text-foreground">{followers}</span>
          <span className="text-xs text-muted-foreground mt-2">粉丝</span>
        </button>
      </div>

      {mounted && createPortal(
        <div inert={!open} aria-hidden={!open} className={cn("fixed inset-0 z-[100]", open ? "" : "pointer-events-none")}>
          {open && (
            <>
              <div className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300 cursor-pointer opacity-100" onClick={() => setOpen(null)} />
              <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
                <div className="relative flex max-h-[70vh] w-full max-w-md flex-col overflow-clip rounded-2xl bg-card border border-border shadow-4 transition-all duration-300 scale-100 opacity-100">
                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <Users className="h-5 w-5 text-primary" strokeWidth={2} />
                      <h2 className="text-base font-semibold text-foreground">{open === "following" ? "关注" : "粉丝"}</h2>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{users.length}</span>
                    </div>
                    <button onClick={() => setOpen(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" strokeWidth={2} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 max-h-[calc(70vh-72px)]">
                    {loading ? (
                      <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : users.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="mb-3 h-10 w-10 text-muted-foreground/30" strokeWidth={1.5} />
                        <p className="text-sm text-muted-foreground">{open === "following" ? "还没有关注任何人" : "还没有粉丝"}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {users.map((u) => {
                          const avatar = u.composedAvatarUrl || u.avatar
                          return (
                            <Link key={u.id} href={`/user/${u.serialId ?? u.id}`} className="group flex items-center gap-3 rounded-xl bg-secondary/40 p-3 hover:bg-secondary/70" onClick={() => setOpen(null)}>
                              {avatar ? (
                                <Image src={avatar} alt={u.username} width={40} height={40} className="h-10 w-10 rounded-full object-cover" unoptimized />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{u.username.slice(0, 1)}</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{u.username}</p>
                                {u.bio && <p className="text-xs text-muted-foreground truncate">{u.bio}</p>}
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
