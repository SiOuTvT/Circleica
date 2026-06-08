"use client"

import { apiPost } from "@/lib/api-client"
import { useCallback, useRef, useState } from "react"
import { useCommentList } from "./use-comment-list"
import { useCommentUpload } from "./use-comment-upload"

export interface CommentUser {
  id: string
  username: string
  avatar: string | null
}

export interface Comment {
  id: string
  content: string
  imageUrl: string | null
  likeCount: number
  createdAt: string
  user: CommentUser
  replies: Comment[]
}

const IDLE = 0
const SUBMITTING = 1
const SUBMITTED = 2

/**
 * 评论系统 hook（组合 hook）
 * 组合 useCommentList + useCommentUpload，添加提交和回复逻辑
 */
export function useComments(gameId: string, initialComments: Comment[], initialCount: number, isLoggedIn: boolean, userId?: string) {
  const [commentStatus, setCommentStatus] = useState(IDLE)
  const [commentText, setCommentText] = useState("")
  const [commentImage, setCommentImage] = useState("")
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const commentBoxRef = useRef<HTMLTextAreaElement>(null)

  // 子 hook：评论列表
  const list = useCommentList(gameId, initialComments, initialCount)

  // 子 hook：图片上传
  const upload = useCommentUpload((url) => setCommentImage(url))

  // 回复评论
  const handleReply = useCallback(
    (commentId: string) => {
      const targetComment = list.comments.find((c) => c.id === commentId)
      if (targetComment) {
        setReplyTo({ id: targetComment.id, username: targetComment.user.username })
        commentBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        setTimeout(() => commentBoxRef.current?.focus(), 300)
      }
    },
    [list.comments]
  )

  // 提交评论
  const handleSubmit = useCallback(async () => {
    if (!commentText.trim() || commentStatus === SUBMITTING) return
    setCommentStatus(SUBMITTING)
    try {
      const data = await apiPost<{
        id: string
        createdAt: string
        content: string
        imageUrl: string | null
        user: { id: string; username: string; avatar: string | null }
      }>(`/api/games/${gameId}/comments`, {
        content: commentText.trim(),
        imageUrl: commentImage || undefined,
        replyToId: replyTo?.id,
      })

      const avatarUrl = (data.user as { avatar?: string | null })?.avatar ?? null

      if (replyTo) {
        list.setComments((prev) =>
          prev.map((c) => {
            if (c.id === replyTo.id) {
              return {
                ...c,
                replies: [
                  ...c.replies,
                  {
                    id: data.id,
                    createdAt: data.createdAt,
                    content: data.content,
                    imageUrl: data.imageUrl ?? null,
                    likeCount: 0,
                    user: { id: data.user.id, username: data.user.username, avatar: avatarUrl },
                    replies: [] as typeof c.replies,
                  },
                ],
              }
            }
            return c
          })
        )
      } else {
        list.setComments((prev) => [
          ...prev,
          {
            id: data.id,
            createdAt: data.createdAt,
            content: data.content,
            imageUrl: data.imageUrl ?? null,
            likeCount: 0,
            user: { id: data.user.id, username: data.user.username, avatar: avatarUrl },
            replies: [],
          },
        ])
      }

      list.setCommentCount((prev) => prev + 1)
      setCommentText("")
      setCommentImage("")
      setReplyTo(null)
      setCommentStatus(SUBMITTED)
      setTimeout(() => setCommentStatus(IDLE), 2000)
    } catch {
      setCommentStatus(IDLE)
    }
  }, [commentText, commentImage, commentStatus, gameId, replyTo, list])

  return {
    comments: list.comments,
    commentCount: list.commentCount,
    commentStatus,
    commentText,
    setCommentText,
    commentImage,
    setCommentImage,
    replyTo,
    setReplyTo,
    commentBoxRef,
    commentLoading: list.commentLoading,
    commentSort: list.commentSort,
    setCommentSort: list.setCommentSort,
    commentHasMore: list.commentHasMore,
    commentPage: 1, // kept for backward compat
    handleSubmit,
    handleLike: list.handleLike,
    handleReply,
    handleDelete: list.handleDelete,
    handleUploadImage: upload.handleUploadImage,
    handleDrop: upload.handleDrop,
    handlePaste: upload.handlePaste,
    loadMore: list.loadMore,
    IDLE,
    SUBMITTING,
    SUBMITTED,
  }
}
