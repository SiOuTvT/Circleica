"use client"

import { cn } from "@/lib/utils"
import { Eye, Heart, MessageSquare } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { memo } from "react"
import type { User, Post } from "../forum-client"

const CATEGORY_LABELS: Record<string, string> = {
  discussion: "讨论",
  help: "求档",
  resource: "资源",
  offtopic: "杂谈",
}

interface ForumPostItemProps {
  post: Omit<Post, "comments">
}

function fmtDate(d: string) {
  const date = new Date(d)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60_000) return "刚刚"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

const Avatar = memo(function Avatar({ user, size = 6 }: { user: User; size?: number }) {
  const px = size * 4
  if (user.avatar) return <Image src={user.avatar} alt={user.username} width={px} height={px} className={`h-${size} w-${size} rounded-full object-cover shrink-0`} unoptimized />
  return <div className={`h-${size} w-${size} rounded-full bg-primary/80 flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0`}>{user.username[0].toUpperCase()}</div>
})

export const ForumPostItem = memo(function ForumPostItem({ post }: ForumPostItemProps) {
  return (
    <Link href={`/forum/${post.id}`}
      className="block rounded-2xl bg-card p-5 ring-1 ring-border transition-all hover:ring-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center gap-2.5">
        <Avatar user={post.user} size={7} />
        <span className="text-sm text-muted-foreground">{post.user.username}</span>
        <span className="text-xs text-muted-foreground/60">·</span>
        <span className="text-xs text-muted-foreground/60">{fmtDate(post.createdAt)}</span>
        {post.updatedAt !== post.createdAt && (
          <span className="text-[10px] text-muted-foreground/50">(已编辑)</span>
        )}
        <span className={cn(
          "ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium",
          post.category === "discussion" ? "bg-blue-500/10 text-blue-400" :
          post.category === "help" ? "bg-amber-500/10 text-amber-400" :
          post.category === "resource" ? "bg-emerald-500/10 text-emerald-400" :
          "bg-purple-500/10 text-purple-400"
        )}>{CATEGORY_LABELS[post.category] || post.category}</span>
      </div>
      <p className="mt-3 line-clamp-2 text-base font-semibold text-foreground leading-relaxed">{post.title}</p>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" strokeWidth={1.5} />{post.likeCount}</span>
        <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />{post.commentCount}</span>
        <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" strokeWidth={1.5} />{post.viewCount}</span>
        {post.isPinned && <span className="text-amber-400">📌 置顶</span>}
        {post.isLocked && <span className="text-red-400">🔒 已锁定</span>}
      </div>
    </Link>
  )
})