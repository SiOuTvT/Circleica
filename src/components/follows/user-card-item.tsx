import Link from "next/link"
import Image from "next/image"
import { Heart } from "lucide-react"
import { timeAgo } from "@/lib/time-ago"

interface UserItem {
  id: string
  serialId: number
  username: string
  avatar: string | null
  bio: string | null
}

/**
 * 关注列表/粉丝列表/用户搜索共用的紧凑用户卡片
 */
export function UserCardItem({ user, createdAt, action }: { user: UserItem; createdAt?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-border/60 transition-shadow hover:ring-border">
      <Link href={`/user/${user.serialId}`} className="shrink-0">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-muted">
          {user.avatar ? (
            <Image src={user.avatar} alt={user.username} width={48} height={48} className="h-full w-full object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-base font-semibold text-muted-foreground">
              {user.username.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/user/${user.serialId}`} className="block truncate text-sm font-medium hover:underline">
          {user.username}
        </Link>
        {user.bio ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{user.bio}</p>
        ) : createdAt ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className="h-3 w-3" /> {timeAgo(createdAt)}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
