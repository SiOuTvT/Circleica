"use client"

import { sanitizeRichText } from "@/lib/sanitize"
import { cn } from "@/lib/utils"

/** 渲染富文本 HTML 内容（已净化，防 XSS） */
export function RichTextContent({ html, className }: { html: string; className?: string }) {
  const clean = sanitizeRichText(html)

  return (
    <div className={cn("rich-text-content", className)} dangerouslySetInnerHTML={{ __html: clean }} />
  )
}
