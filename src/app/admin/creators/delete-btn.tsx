"use client"

import { AdminDeleteButton } from "@/components/admin-delete-button"
import { adminBtnDanger } from "@/lib/admin-styles"
import { cn } from "@/lib/utils"

export function CreatorDeleteBtn({ id, gameCount }: { id: string; gameCount: number }) {
  return (
    <AdminDeleteButton
      endpoint={`/api/admin/creators/${id}`}
      title="删除创作者"
      description={
        gameCount > 0
          ? `TA 还在 ${gameCount} 部作品的班底里，删除会同时从这些作品的创作者中移除，作品本身不会被删除。`
          : "确定要删除该创作者吗？相关游戏不会被删除，但创作者信息将被移除。删了就找不回来了。"
      }
      successMessage="创作者已删除"
      buttonTitle="删除创作者"
      buttonClassName={cn(adminBtnDanger, "text-xs")}
    />
  )
}
