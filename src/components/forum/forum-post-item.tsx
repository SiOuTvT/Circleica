"use client"

import { cn } from "@/lib/utils"
import { Eye, Heart, Lock, MessageSquare, Pin } from "lucide-react"
import Link from "next/link"
import { memo } from "react"
import { Tag } from "@/components/ui/tag"
import type { Post } from "./forum-client-root"
import { timeAgo } from "@/lib/time-ago"
import { UserAvatar } from "@/components/user-avatar"

const CATEGORY_LABELS: Record<string, string> = {
  discussion: "讨论",
  question: "求档",
  showcase: "资源",
  feedback: "杂谈",
  guide: "教程",
}

interface ForumPostItemProps {
  post: Omit<Post, "comments">
}

// fmtDate 已统一为 timeAgo（H1 迁移至 @/lib/time-ago）
// Avatar 已统一为用户头像组件 UserAvatar（H3 消除 4 处本地定义）


export const ForumPostItem = memo(function ForumPostItem({ post }: ForumPostItemProps) {
  return (
    <Link href={`/forum/${post.id}`}
      className="game-card block rounded-2xl bg-card p-4 sm:p-5 ring-1 ring-border transition-all hover:ring-primary/30">
      <div className="flex items-center gap-2.5 min-w-0">
        <UserAvatar user={post.user} size={28} />
        <span className="text-sm text-muted-foreground truncate">{post.user.username}</span>
        <span className="text-xs text-muted-foreground/60 shrink-0">·</span>
        <span className="text-xs text-muted-foreground/60 shrink-0">{timeAgo(post.createdAt)}</span>
        {post.updatedAt !== post.createdAt && (
          <span className="text-micro text-muted-foreground/50 shrink-0">(已编辑)</span>
        )}
        <Tag variant="badge" className={cn(
          "ml-auto shrink-0",
          post.category === "discussion" ? "bg-blue-500/10 text-blue-400" :
          post.category === "question" ? "bg-amber-500/10 text-amber-400" :
          post.category === "showcase" ? "bg-emerald-500/10 text-emerald-400" :
          "bg-purple-500/10 text-purple-400"
        )}>{CATEGORY_LABELS[post.category] || post.category}</Tag>
      </div>
      <p className="mt-3 line-clamp-2 text-base font-semibold text-foreground leading-relaxed">{post.title}</p>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" strokeWidth={1.5} />{post.likeCount}</span>
        <span className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" strokeWidth={1.5} />{post.commentCount}</span>
        <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" strokeWidth={1.5} />{post.viewCount}</span>
        {post.isPinned && <span className="text-amber-400 flex items-center gap-1"><Pin className="h-3.5 w-3.5" strokeWidth={2} /> 置顶</span>}
        {post.isLocked && <span className="text-red-400 flex items-center gap-1"><Lock className="h-3.5 w-3.5" strokeWidth={2} /> 已锁定</span>}
      </div>
    </Link>
  )
})