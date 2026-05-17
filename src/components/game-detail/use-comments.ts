"use client"

import { apiGet, apiPost } from "@/lib/api-client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
 * 评论系统 hook
 * 封装评论的增删改查、分页、排序、图片上传等逻辑
 */
export function useComments(gameId: string, initialComments: Comment[], initialCount: number, isLoggedIn: boolean, userId?: string) {
  const [comments, setComments] = useState(initialComments)
  const [commentCount, setCommentCount] = useState(initialCount)
  const [commentStatus, setCommentStatus] = useState(IDLE)
  const [commentText, setCommentText] = useState("")
  const [commentImage, setCommentImage] = useState("")
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const commentBoxRef = useRef<HTMLTextAreaElement>(null)
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentSort, setCommentSort] = useState<"newest" | "hot">("newest")
  const [commentPage, setCommentPage] = useState(1)
  const [commentHasMore, setCommentHasMore] = useState(true)

  // 预加载评论（AbortController 防竞态）
  useEffect(() => {
    const controller = new AbortController()
    setCommentLoading(true)
    const sort = commentSort === "hot" ? "hot" : undefined
    apiGet<{ comments: Comment[] }>(`/api/games/${gameId}/comments?page=1&limit=10${sort ? "&sort=hot" : ""}`, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setCommentPage(2)
        setCommentHasMore(true)
        const list = data.comments ?? []
        if (list.length < 10) {
          setCommentHasMore(false)
        }
        setComments(list)
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setCommentLoading(false)
      })
    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentSort])

  // 评论排序
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      if (commentSort === "hot") {
        return b.likeCount - a.likeCount
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [comments, commentSort])

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
        setComments((prev) =>
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
        setComments((prev) => [
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

      setCommentCount((prev) => prev + 1)
      setCommentText("")
      setCommentImage("")
      setReplyTo(null)
      setCommentStatus(SUBMITTED)
      setTimeout(() => setCommentStatus(IDLE), 2000)
    } catch {
      setCommentStatus(IDLE)
    }
  }, [commentText, commentImage, commentStatus, gameId, replyTo])

  // 评论点赞
  const handleLike = useCallback(async (commentId: string) => {
    try {
      const data = await apiPost<{ liked: boolean; likeCount: number }>(`/api/comments/${commentId}/like`)
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, likeCount: data.likeCount }
          }
          return c
        })
      )
    } catch {}
  }, [])

  // 回复评论
  const handleReply = useCallback(
    (commentId: string) => {
      const targetComment = comments.find((c) => c.id === commentId)
      if (targetComment) {
        setReplyTo({ id: targetComment.id, username: targetComment.user.username })
        commentBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        setTimeout(() => commentBoxRef.current?.focus(), 300)
      }
    },
    [comments]
  )

  // 删除评论
  const handleDelete = useCallback(async (commentId: string) => {
    try {
      const data = await apiPost<{ deleted: boolean }>(`/api/comments/${commentId}/delete`)
      if (data.deleted) {
        setComments((prev) => {
          const rootComment = prev.find((c) => c.id === commentId)
          if (rootComment) {
            const deletedRepliesCount = rootComment.replies.length
            setCommentCount((prevCount) => Math.max(0, prevCount - 1 - deletedRepliesCount))
            return prev.filter((c) => c.id !== commentId)
          }

          let deletedRepliesCount = 0
          const updatedComments = prev.map((c) => {
            const replyIndex = c.replies.findIndex((r) => r.id === commentId)
            if (replyIndex !== -1) {
              deletedRepliesCount = 1
              return { ...c, replies: c.replies.filter((r) => r.id !== commentId) }
            }
            return c
          })

          setCommentCount((prevCount) => Math.max(0, prevCount - deletedRepliesCount))
          return updatedComments
        })
      }
    } catch {}
  }, [])

  // 图片上传
  const handleUploadImage = useCallback(async (file: File) => {
    const body = new FormData()
    body.append("file", file)
    try {
      const data = await apiPost<{ url: string }>("/api/upload", body)
      return data.url ?? null
    } catch {
      return null
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) {
        handleUploadImage(file).then((url) => {
          if (url) setCommentImage(url)
        })
      }
    },
    [handleUploadImage]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile()
          if (file) {
            e.preventDefault()
            handleUploadImage(file).then((url) => {
              if (url) setCommentImage(url)
            })
            return
          }
        }
      }
    },
    [handleUploadImage]
  )

  // 加载更多（带 AbortController）
  const loadMore = useCallback(async () => {
    if (commentLoading) return
    setCommentLoading(true)
    const controller = new AbortController()
    try {
      const sort = commentSort === "hot" ? "hot" : undefined
      const data = await apiGet<{ comments: Comment[] }>(
        `/api/games/${gameId}/comments?page=${commentPage}&limit=10${sort ? "&sort=hot" : ""}`,
        controller.signal,
      )
      if (controller.signal.aborted) return
      const newComments = data.comments ?? []
      if (newComments.length === 0) {
        setCommentHasMore(false)
      } else {
        setCommentPage((prev) => prev + 1)
        if (newComments.length < 10) {
          setCommentHasMore(false)
        }
        setComments((prev) => [...prev, ...newComments])
      }
    } catch { /* ignore abort */ }
    finally {
      if (!controller.signal.aborted) setCommentLoading(false)
    }
  }, [commentLoading, commentSort, gameId, commentPage])

  return {
    comments: sortedComments,
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
    IDLE,
    SUBMITTING,
    SUBMITTED,
  }
}