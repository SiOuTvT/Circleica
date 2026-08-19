"use client"

import { AdminDeleteButton } from "@/components/admin-delete-button"

export function GameResourceDeleteBtn({ id, name }: { id: string; name: string }) {
  return (
    <AdminDeleteButton
      endpoint={`/api/admin/game-resources/${id}`}
      title="删除资源"
      description={`确定要删除资源「${name}」吗？其下载条目、下载日志和举报记录会一并删除。`}
      successMessage="资源已删除"
    />
  )
}
