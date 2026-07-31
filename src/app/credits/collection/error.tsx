"use client"

import { useEffect } from "react"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { ArchivePlaceholder } from "@/components/archive/archive-placeholder"

export default function CollectionListError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[CollectionList] render error", error)
  }, [error])

  return (
    <ArchiveShell entity="collection" density="standard">
      <ArchivePlaceholder state="error" entity="collection" message="合集加载失败，请稍后重试" retryHref="/credits/collection" />
    </ArchiveShell>
  )
}
