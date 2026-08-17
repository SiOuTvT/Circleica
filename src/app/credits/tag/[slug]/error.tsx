"use client"

import { useEffect } from "react"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"
import { captureClientError } from "@/lib/client-error"

export default function TagDetailError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureClientError(error)
  }, [error])

  return (
    <ArchiveShell entity="tag" density="standard">
      <ArchivePlaceholder state="error" entity="tag" message="标签加载失败，请稍后重试" retryHref="/credits/tag" />
    </ArchiveShell>
  )
}
