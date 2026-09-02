"use client"

import { useState } from "react"
import Link from "next/link"
import { UserCardItem } from "@/components/follows/user-card-item"
import { FollowButton } from "@/components/follow-button"

interface FollowRow {
  id: string
  user: { id: string; serialId: number; username: string; avatar: string | null; bio: string | null }
  createdAt?: string
}

export function FollowsList({ initialItems, initialTotal }: { initialItems: FollowRow[]; initialTotal: number }) {
  const [items, setItems] = useState(initialItems)
  const [total, setTotal] = useState(initialTotal)

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">共 {total} 人</span>
      </div>
      <div className="grid gap-2 sm:gap-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="text-sm text-muted-foreground">还没有关注任何人</p>
            <p className="mt-1 text-xs text-muted-foreground">
              去 <Link href="/discover" className="text-primary hover:underline underline-offset-4 decoration-1 transition-colors duration-200">发现</Link> 看看感兴趣的用户吧
            </p>
          </div>
        ) : (
          items.map((f) => (
            <UserCardItem
              key={f.id}
              user={f.user}
              createdAt={f.createdAt}
              action={
                <FollowButton
                  targetUserId={f.user.id}
                  initialFollowing
                  size="sm"
                  onChange={(following) => {
                    if (!following) {
                      setItems((prev) => prev.filter((it) => it.id !== f.id))
                      setTotal((t) => t - 1)
                    }
                  }}
                />
              }
            />
          ))
        )}
      </div>
    </>
  )
}
