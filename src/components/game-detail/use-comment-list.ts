"use client"

import { apiGet } from "@/lib/api-client"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { Comment } from "./use-comments"

/**
 * 评论列表 hook
 * 封装评论的获取、排序、分页、点赞、删除逻辑
 */
export function useCommentList(gameId: string, initialComments: Comment[], initialCount: number) {
  const [comments, setComments] = useState(initialComments)
  const [commentCount, setCommentCount] = useState(initialCount)
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentSort, setCommentSort] = useState<"newest" | "hot">("newest")
  const [commentPage, setCommentPage] = useState(1)
  const [commentHasMore, setCommentHasMore] = useState(true)

  // 预加载评论（AbortController 防竞态）
  useEffect(() => {
    const controller = new AbortController()
    setCommentLoading(true)
    const sort = commentSort === "hot" ? "hot" : undefined
    apiGet<{ comments: Comment[] }>(`/api/games/${gameId}/comments?page=1&limit=10${sort ? "&sort=hot" : ""}`, { signal: controller.signal })
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

  // 评论点赞
  const handleLike = useCallback(async (commentId: string) => {
    try {
      const data = await apiGet<{ liked: boolean; likeCount: number }>(`/api/comments/${commentId}/like`)
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

  // 删除评论
  const handleDelete = useCallback(async (commentId: string) => {
    try {
      const data = await apiGet<{ deleted: boolean }>(`/api/comments/${commentId}/delete`)
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

  // 加载更多（带 AbortController）
  const loadMore = useCallback(async () => {
    if (commentLoading) return
    setCommentLoading(true)
    const controller = new AbortController()
    try {
      const sort = commentSort === "hot" ? "hot" : undefined
      const data = await apiGet<{ comments: Comment[] }>(
        `/api/games/${gameId}/comments?page=${commentPage}&limit=10${sort ? "&sort=hot" : ""}`,
        { signal: controller.signal },
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
    setCommentCount,
    commentLoading,
    commentSort,
    setCommentSort,
    commentHasMore,
    handleLike,
    handleDelete,
    loadMore,
    setComments,
  }
}
