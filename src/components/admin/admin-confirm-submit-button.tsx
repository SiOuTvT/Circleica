"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface AdminConfirmSubmitButtonProps {
  /** 要执行的 server action（由调用方从 "use server" 模块传入） */
  action: (fd: FormData) => Promise<void> | void
  /** 提交给 action 的字段（逐项 append 进 FormData） */
  formData: Record<string, string>
  label: React.ReactNode
  title: string
  description: string
  confirmText?: string
  className?: string
}

/**
 * 危险操作（删草稿等）的二次确认按钮：点一下只开弹窗，确认后才真正调 action。
 * 关闭时机交给 ConfirmDialog 自己的机制（await onConfirm() 后自动关闭），
 * 不在本组件里手动关，避免与它冲突。
 */
export function AdminConfirmSubmitButton({
  action,
  formData,
  label,
  title,
  description,
  confirmText = "删除",
  className,
}: AdminConfirmSubmitButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmText={confirmText}
        variant="destructive"
        onConfirm={async () => {
          const fd = new FormData()
          for (const [key, value] of Object.entries(formData)) fd.append(key, value)
          await action(fd)
        }}
      />
    </>
  )
}
