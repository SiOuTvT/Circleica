"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { apiDeleteSafe } from "@/lib/api-client"
import { adminBtnDanger } from "@/lib/admin-styles"
import { cn } from "@/lib/utils"

interface AdminDeleteButtonProps {
  /** 删除 API 端点（支持 URL 参数或 JSON body 两种模式） */
  endpoint: string
  /** 对话框标题 */
  title: string
  /** 对话框描述 */
  description: string
  /** 删除成功 toast 文案 */
  successMessage: string
  /** 按钮 tooltip */
  buttonTitle?: string
  /** 使用 JSON body 而非 URL 参数（如 /api/admin/reports 以 body 传 id） */
  body?: Record<string, unknown>
  /** 自定义按钮 className（覆盖默认） */
  buttonClassName?: string
}

/**
 * 通用管理员删除按钮
 *
 * 消除 6 份重复的 admin delete-btn 实现（M1）：
 * - 相同模式：按钮 → ConfirmDialog → fetch DELETE → toast → router.refresh()
 * - 仅 endpoint / 文案 / body 模式不同
 */
export function AdminDeleteButton({
  endpoint,
  title,
  description,
  successMessage,
  buttonTitle = "删除",
  body,
  buttonClassName,
}: AdminDeleteButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    const { ok, error } = await apiDeleteSafe(endpoint, body)
    if (ok) {
      toast.success(successMessage)
      router.refresh()
    } else {
      toast.error(error || "删除失败")
    }
  }

  return (
    <>
      {/* 图标 + 文字：与同行「编辑」等操作按钮同一套形态 —— 纯图标容易被当成装饰、且与文字按钮不对称 */}
      <button
        onClick={() => setOpen(true)}
        title={buttonTitle}
        className={buttonClassName ?? cn(adminBtnDanger, "h-7 px-2.5 text-xs")}
      >
        <Trash2 className="h-3.5 w-3.5" />
        删除
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}
