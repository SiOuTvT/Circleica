"use client"

import { memo } from "react"
import type { Comment } from "./use-comments"

export const CommentItem = memo(function CommentItem({
  comment,
  isLoggedIn,
  onLike,
  onReply,
  onDelete,
}: {
  comment: Comment
  isLoggedIn: boolean
  onLike: (id: string) => void
  onReply: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-card rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        {comment.user.avatar ? (
          <img
            src={comment.user.avatar}
            alt={comment.user.username}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
            {comment.user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">{comment.user.username}</span>
          <p className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">{comment.content}</p>
          {comment.imageUrl && (
            <img
              src={comment.imageUrl}
              alt="comment"
              className="mt-2 max-h-48 rounded-lg object-cover cursor-pointer"
            />
          )}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => onLike(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[36px] px-2"
            >
              👍 {comment.likeCount > 0 ? comment.likeCount : ""}
            </button>
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[36px] px-2"
            >
              回复
            </button>
            {isLoggedIn && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors min-h-[36px] px-2"
              >
                删除
              </button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(comment.createdAt).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-8 space-y-3 border-l-2 border-secondary pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-3">
              {reply.user.avatar ? (
                <img
                  src={reply.user.avatar}
                  alt={reply.user.username}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-muted-foreground flex-shrink-0">
                  {reply.user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-foreground">{reply.user.username}</span>
                <p className="mt-0.5 text-sm text-foreground whitespace-pre-wrap break-words">{reply.content}</p>
                {reply.imageUrl && (
                  <img
                    src={reply.imageUrl}
                    alt="reply"
                    className="mt-1 max-h-32 rounded-lg object-cover"
                  />
                )}
                <div className="flex items-center gap-3 mt-1">
                  <button
                    onClick={() => onLike(reply.id)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[32px] px-1.5"
                  >
                    👍 {reply.likeCount > 0 ? reply.likeCount : ""}
                  </button>
                  <button
                    onClick={() => onDelete(reply.id)}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors min-h-[32px] px-1.5"
                  >
                    删除
                  </button>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(reply.createdAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})