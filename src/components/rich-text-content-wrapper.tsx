"use client"

import dynamic from "next/dynamic"

const RichTextContent = dynamic(
  () => import("./rich-text-content").then(m => ({ default: m.RichTextContent })),
  {
    loading: () => <div className="animate-pulse rounded-lg bg-muted h-20" />,
    ssr: false,
  }
)

export { RichTextContent }
