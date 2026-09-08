"use client"

import { AdminDeleteButton } from "@/components/admin-delete-button"
import { adminBtnDanger } from "@/lib/admin-styles"
import { cn } from "@/lib/utils"

export function CreatorDeleteBtn({ id }: { id: string }) {
  return (
    <AdminDeleteButton
      endpoint={`/api/admin/creators/${id}`}
      title="删除创作者"
      description="确定要删除该创作者吗？相关游戏不会被删除，但创作者信息将被移除。删了就找不回来了。"
      successMessage="创作者已删除"
      buttonTitle="删除创作者"
      buttonClassName={cn(adminBtnDanger, "text-xs")}
    />
  )
}
