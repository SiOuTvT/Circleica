"use client"

import { apiPost } from "@/lib/api-client"
import { useCallback } from "react"

/**
 * 评论图片上传 hook
 * 封装图片上传、拖拽、粘贴逻辑
 */
export function useCommentUpload(onUploaded: (url: string) => void) {
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
          if (url) onUploaded(url)
        })
      }
    },
    [handleUploadImage, onUploaded]
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
              if (url) onUploaded(url)
            })
            return
          }
        }
      }
    },
    [handleUploadImage, onUploaded]
  )

  return { handleUploadImage, handleDrop, handlePaste }
}
