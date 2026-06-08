"use client"

import { CommentItem } from "./comment-item"
import type { useComments } from "./use-comments"

type CommentsState = ReturnType<typeof useComments>

interface CommentsSectionProps {
  isLoggedIn: boolean
  comments: CommentsState
}

export function CommentsSection({ isLoggedIn, comments }: CommentsSectionProps) {
  const {
    comments: commentList,
    commentCount,
    commentStatus,
    commentText,
    setCommentText,
    commentImage,
    setCommentImage,
    replyTo,
    setReplyTo,
    commentBoxRef,
    commentLoading,
    commentSort,
    setCommentSort,
    commentHasMore,
    commentPage,
    handleSubmit,
    handleLike,
    handleReply,
    handleDelete,
    handleUploadImage,
    handleDrop,
    handlePaste,
    loadMore,
    SUBMITTING,
    SUBMITTED,
  } = comments

  return (
    <div className="space-y-4">
      {isLoggedIn && (
        <div className="bg-card rounded-2xl p-5 space-y-4">
          <textarea
            ref={commentBoxRef}
            placeholder={replyTo ? `回复 @${replyTo.username}...` : "写下你的评论..."}
            rows={4}
            className="w-full p-3 rounded-xl bg-background border border-input text-sm resize-none focus:outline-none focus:border-blue-500 transition-[border-color]"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onDrop={handleDrop}
            onPaste={handlePaste}
          />

          {commentImage && (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={commentImage}
                alt="uploaded"
                className="max-h-32 rounded-lg object-cover"
              />
              <button
                onClick={() => setCommentImage("")}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center hover:bg-destructive/80 transition-opacity"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-h-[44px] px-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>上传图片</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const url = await handleUploadImage(file)
                    if (url) setCommentImage(url)
                  }
                }}
              />
            </label>

            {replyTo && (
              <button
                onClick={() => setReplyTo(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-3"
              >
                取消回复
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={!commentText.trim() || commentStatus === SUBMITTING}
              className="px-6 py-2.5 min-h-[44px] rounded-full text-sm font-semibold text-primary-foreground bg-primary transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {commentStatus === SUBMITTING ? "提交中…" : commentStatus === SUBMITTED ? "已发布 ✓" : "发布评论"}
            </button>
          </div>
        </div>
      )}

      {/* Comment list */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-semibold text-foreground">
            {commentCount} 条评论
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setCommentSort("newest")}
              className={`px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium transition-colors ${
                commentSort === "newest"
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              最新
            </button>
            <button
              onClick={() => setCommentSort("hot")}
              className={`px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium transition-colors ${
                commentSort === "hot"
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              最热
            </button>
          </div>
        </div>

        {commentLoading && commentList.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">加载评论中...</p>
          </div>
        ) : (
          <>
            {commentList.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                isLoggedIn={isLoggedIn}
                onLike={handleLike}
                onReply={handleReply}
                onDelete={handleDelete}
              />
            ))}

            {commentHasMore && !commentLoading && (
              <button
                onClick={loadMore}
                className="w-full py-3 min-h-[44px] rounded-2xl bg-secondary text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
              >
                加载更多
              </button>
            )}

            {!commentHasMore && commentPage > 1 && (
              <div className="text-center py-4">
                <span className="text-sm text-muted-foreground">已加载全部评论</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
