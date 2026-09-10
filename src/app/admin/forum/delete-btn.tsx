"use client"

import { AdminDeleteButton } from "@/components/admin-delete-button"

export function ForumDeleteBtn({ id, commentCount }: { id: string; commentCount: number }) {
  return (
    <AdminDeleteButton
      endpoint={`/api/admin/forum/${id}`}
      title="删除帖子"
      description={
        commentCount > 0
          ? `这篇帖子下面还有 ${commentCount} 条评论，删除后评论一并消失，找不回来了。`
          : "确定要删除这篇帖子吗？删了就找不回来了。"
      }
      successMessage="帖子已删除"
    />
  )
}
