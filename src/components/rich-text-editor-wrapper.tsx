"use client"

import dynamic from "next/dynamic"

const RichTextEditor = dynamic(() => import("./rich-text-editor").then(m => ({ default: m.RichTextEditor })), {
  loading: () => <div className="h-[300px] animate-pulse rounded-xl border border-border bg-muted" />,
  ssr: false,
})

export { RichTextEditor }
