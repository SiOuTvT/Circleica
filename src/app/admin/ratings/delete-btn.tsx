"use client"

import { AdminDeleteButton } from "@/components/admin-delete-button"

export function RatingDeleteBtn({ gameId, title }: { gameId: string; title: string }) {
  return (
    <AdminDeleteButton
      endpoint={`/api/admin/ratings/${gameId}`}
      title="删除该游戏评分"
      description={`确定要删除《${title}》的全部评分数据吗？此操作不可恢复。`}
      successMessage="评分数据已删除"
    />
  )
}
